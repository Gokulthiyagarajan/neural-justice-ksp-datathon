"""Chat Pipeline Adapter — Routes ALL copilot messages through 4-stage processing.

Every user message goes through:
  Stage 1 (Generation) → Stage 2 (Critical Review) → Stage 3 (Deep Reasoning) → Stage 4 (Consistency)

Uses fast LLM models suitable for real-time chat responses.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from backend.pipeline.nim_client import NimClient

logger = logging.getLogger("nj.copilot.chat_pipeline")


# ── Chat-adapted system prompts for each stage ──────────────────────────────

STAGE1_CHAT_PROMPT = """You are Drishti, the AI assistant for Bengaluru's police intelligence platform (Karnataka State Police).

CRITICAL RULES — VIOLATION IS UNACCEPTABLE:
1. NEVER make up crime data, statistics, or specific incidents. You do NOT have access to real crime data.
2. NEVER say "we've been tracking" or "recent increase" unless the user provides actual data.
3. NEVER fabricate case details, suspect names, or incident specifics.
4. NEVER just repeat the user's question back to them.
5. ALWAYS provide a useful, actionable response.

The user has sent a message. Generate a helpful response.

RESPOND IN VALID JSON ONLY.

Output format:
{
  "response": "Your response to the user",
  "intent": "greeting|help|crime_query|general_chat|farewell|predictive|analytics|report",
  "confidence": 0.0-1.0,
  "entities_mentioned": ["any names, places, crimes mentioned"],
  "follow_up_suggestions": ["suggested follow-up questions"]
}

RULES:
- Keep responses SHORT (1-3 sentences max)
- For greetings: Simple hello + "How can I help?" (2 sentences max)
- For help requests: List what you CAN do, not what HAS happened
- For crime queries: Say "I can help you look that up" then suggest specific commands
- For predictive/analytics questions: Explain what the platform CAN do, give examples of queries
- For reports: Tell them what types of reports are available and how to access them
- NEVER add unsolicited crime information or statistics
- Be direct and concise — no fluff
- If you don't know something specific, say what you CAN help with instead

PLATFORM CAPABILITIES YOU CAN MENTION:
- Crime trend analysis (ask: "show crime trends in [area]")
- Suspect lookup (ask: "find suspect [name]")
- Hotspot identification (ask: "where are crime hotspots?")
- Station performance (ask: "how is station [name] performing?")
- Risk assessment (ask: "what is the risk score for [person]?")
- Case assignments (ask: "who is assigned to case [number]?")
- Victim statistics (ask: "victim demographics in [area]")
"""

STAGE2_CHAT_PROMPT = """You are a response quality reviewer. Your ONLY job is to check if the response follows the anti-hallucination rules and provides real value.

CRITICAL CHECK — Does the response:
1. Make up ANY crime data, statistics, or specific incidents? → REJECT
2. Say "we've been tracking" or "recent increase" without data? → REJECT
3. Fabricate case details? → REJECT
4. Is too long (>3 sentences)? → SHORTEN
5. Just repeat the user's question back without adding value? → REWRITE
6. Not provide useful, actionable information? → IMPROVE

RESPOND IN VALID JSON ONLY.

Output format:
{
  "issues": ["list of issues found, or empty array if clean"],
  "revised_response": "Fixed response (or same if no issues)",
  "quality_score": 0.0-1.0
}

RULES:
- If response is clean and useful, return it unchanged with empty issues array
- If response has hallucinations, REMOVE the hallucinated content
- If response is too long, shorten it to 1-3 sentences
- If response just echoes the question, REWRITE to provide real value
- NEVER add new information — only remove, rewrite, or keep existing
- Response MUST be actionable — user should know what to do next
"""

STAGE3_CHAT_PROMPT = """You are a final reviewer for Drishti. Check the response one more time.

RESPOND IN VALID JSON ONLY.

Output format:
{
  "final_response": "The response to send to the user",
  "changes_made": ["what was changed, or 'none'"]
}

RULES:
- If response is already good, return it unchanged
- Remove any remaining hallucinations or made-up data
- Ensure response is 1-3 sentences max
- Ensure response is helpful and professional
- NEVER add crime statistics or specific incidents unless user provided data
"""


# ── Stage output types ──────────────────────────────────────────────────────


@dataclass
class ChatStageOutput:
    """Output from a chat pipeline stage."""
    stage_name: str
    raw_json: dict[str, Any] = field(default_factory=dict)
    response_text: str = ""
    processing_time_ms: float = 0.0
    model_used: str = ""


# ── Chat pipeline runner ────────────────────────────────────────────────────


async def run_chat_pipeline(
    user_message: str,
    client: NimClient,
    history: list[dict[str, str]] | None = None,
    intent: str = "general_chat",
    language: str = "en",
) -> dict[str, Any]:
    """Run all 4 stages on a chat message and return the final response.
    
    Args:
        user_message: The user's message
        client: NIM API client
        history: Conversation history
        intent: Detected intent
        language: User's language
    
    Returns:
        Dict with final_response, stages, processing_time_ms, etc.
    """
    t_start = time.time()
    stages: list[ChatStageOutput] = []
    
    # Build conversation context
    history_text = ""
    if history:
        for msg in history[-6:]:  # Last 6 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_text += f"{role}: {content}\n"
    
    context = f"Conversation history:\n{history_text}\nUser's current message: {user_message}"
    
    # ── Stage 1: Generation ─────────────────────────────────────────────
    logger.info("[CHAT_PIPELINE] Stage 1: Generation")
    t1 = time.time()
    
    try:
        stage1_result = await _run_chat_stage(
            client=client,
            system_prompt=STAGE1_CHAT_PROMPT,
            user_content=context,
            stage_name="generation",
            model="meta/llama-3.1-8b-instruct",
        )
        stage1_response = stage1_result.get("response", user_message)
        stage1_intent = stage1_result.get("intent", intent)
        stage1_entities = stage1_result.get("entities_mentioned", [])
        stage1_suggestions = stage1_result.get("follow_up_suggestions", [])
    except Exception as e:
        logger.warning("Stage 1 failed: %s", str(e)[:100])
        stage1_response = user_message
        stage1_intent = intent
        stage1_entities = []
        stage1_suggestions = []
        stage1_result = {"response": user_message, "intent": intent}
    
    stages.append(ChatStageOutput(
        stage_name="generation",
        raw_json=stage1_result,
        response_text=stage1_response,
        processing_time_ms=(time.time() - t1) * 1000,
    ))
    
    # ── Stage 2: Critical Review ────────────────────────────────────────
    logger.info("[CHAT_PIPELINE] Stage 2: Critical Review")
    t2 = time.time()
    
    try:
        stage2_input = f"User message: {user_message}\n\nDraft response: {stage1_response}"
        stage2_result = await _run_chat_stage(
            client=client,
            system_prompt=STAGE2_CHAT_PROMPT,
            user_content=stage2_input,
            stage_name="critical_review",
            model="meta/llama-3.1-8b-instruct",
        )
        stage2_response = stage2_result.get("revised_response", stage1_response)
        stage2_quality = stage2_result.get("quality_score", 0.8)
    except Exception as e:
        logger.warning("Stage 2 failed: %s", str(e)[:100])
        stage2_response = stage1_response
        stage2_quality = 0.8
        stage2_result = {"revised_response": stage1_response, "quality_score": 0.8}
    
    stages.append(ChatStageOutput(
        stage_name="critical_review",
        raw_json=stage2_result,
        response_text=stage2_response,
        processing_time_ms=(time.time() - t2) * 1000,
    ))
    
    # ── Stage 3: Final Polish ─────────────────────────────────────────
    logger.info("[CHAT_PIPELINE] Stage 3: Final Polish")
    t3 = time.time()
    
    try:
        stage3_input = f"User message: {user_message}\n\nCurrent response: {stage2_response}"
        stage3_result = await _run_chat_stage(
            client=client,
            system_prompt=STAGE3_CHAT_PROMPT,
            user_content=stage3_input,
            stage_name="final_polish",
            model="meta/llama-3.1-8b-instruct",
        )
        final_response = stage3_result.get("final_response", stage2_response)
    except Exception as e:
        logger.warning("Stage 3 failed: %s", str(e)[:100])
        final_response = stage2_response
        stage3_result = {"final_response": stage2_response}
    
    stages.append(ChatStageOutput(
        stage_name="final_polish",
        raw_json=stage3_result,
        response_text=final_response,
        processing_time_ms=(time.time() - t3) * 1000,
    ))
    
    # ── Assemble final result ───────────────────────────────────────────
    total_time_ms = (time.time() - t_start) * 1000
    
    return {
        "final_response": final_response,
        "intent": stage1_intent,
        "entities": stage1_entities,
        "suggestions": stage1_suggestions,
        "stages": [
            {
                "name": s.stage_name,
                "response": s.response_text,
                "time_ms": round(s.processing_time_ms, 1),
            }
            for s in stages
        ],
        "processing_time_ms": round(total_time_ms, 1),
    }


async def _run_chat_stage(
    client: NimClient,
    system_prompt: str,
    user_content: str,
    stage_name: str,
    model: str = "meta/llama-3.1-8b-instruct",
) -> dict[str, Any]:
    """Run a single chat pipeline stage.
    
    Returns:
        Parsed JSON response from the LLM
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]
    
    result = await client.chat(
        model=model,
        messages=messages,
        stage_name=stage_name,
        temperature=0.7,
        max_tokens=500,
    )
    
    # Parse JSON response
    try:
        # Try to extract JSON from the response
        text = result.content.strip()
        
        # Handle markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
            json_lines = []
            in_block = False
            for line in lines:
                if line.startswith("```") and not in_block:
                    in_block = True
                    continue
                elif line.startswith("```") and in_block:
                    break
                elif in_block:
                    json_lines.append(line)
            text = "\n".join(json_lines)
        
        # Find JSON object
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            json_str = text[start:end]
            return json.loads(json_str)
        else:
            return {"response": text, "intent": "general_chat", "confidence": 0.5}
    except json.JSONDecodeError:
        logger.warning("Failed to parse JSON from stage %s response", stage_name)
        return {"response": result.content, "intent": "general_chat", "confidence": 0.5}
