"""Pipeline Stage 3: Deep Reasoning.

Uses DeepSeek R1 for deep chain-of-thought reasoning on investigation data.
Analyzes Stage 1 + Stage 2 outputs, detects patterns, builds evidence chains.
Only runs in deep mode.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from backend.pipeline.nim_client import NimClient, Models, NimError
from backend.pipeline.evidence_verifier import Claim, EvidenceVerifier, VerificationResult

logger = logging.getLogger("nj.pipeline.stage_3")


# ── Data types ─────────────────────────────────────────────────────────────


@dataclass
class Stage3Output:
    """Output from Stage 3 deep reasoning."""

    raw_text: str = ""
    analysis: str = ""
    final_claims: list[dict[str, Any]] = field(default_factory=list)
    evidence_chains: list[dict[str, Any]] = field(default_factory=list)
    patterns_detected: list[str] = field(default_factory=list)
    confidence_adjustments: list[dict[str, Any]] = field(default_factory=list)
    verification: VerificationResult | None = None


# ── System prompt ──────────────────────────────────────────────────────────

STAGE3_SYSTEM_PROMPT = """You are a senior criminal intelligence analyst with deep reasoning capabilities for the Karnataka State Police.

Your task: Perform deep chain-of-thought reasoning on the investigation data from previous stages.

RESPOND IN VALID JSON ONLY. No markdown, no prose outside JSON.

Output format:
{
  "analysis": "Deep analytical reasoning paragraph connecting all evidence",
  "final_claims": [
    {
      "text": "Final verified claim after deep reasoning",
      "confidence": 0.0-1.0,
      "type": "factual|inferential|recommendation",
      "evidence_chain": ["Step 1 reasoning", "Step 2 reasoning", "Conclusion"],
      "reasoning_depth": "surface|moderate|deep"
    }
  ],
  "evidence_chains": [
    {
      "claim_id": "identifier",
      "chain": ["Evidence piece 1", "Evidence piece 2", "Logical connection", "Conclusion"],
      "strength": "strong|moderate|weak"
    }
  ],
  "patterns_detected": [
    "Description of a pattern found across the data"
  ],
  "confidence_adjustments": [
    {
      "claim_text": "Original claim text",
      "old_confidence": 0.0,
      "new_confidence": 0.0,
      "reason": "Why confidence was adjusted"
    }
  ]
}

REASONING RULES:
- Build explicit evidence chains for every claim
- Connect disparate pieces of information
- Detect temporal, geographic, and behavioral patterns
- Adjust confidence based on evidence chain strength
- Maximum 6 final claims
- Maximum 4 evidence chains
- Maximum 5 patterns
- Think step-by-step: show your reasoning chain
"""


# ── Stage 3 runner ─────────────────────────────────────────────────────────


async def run_stage_3(
    stage1_output: dict[str, Any],
    client: NimClient,
    stage2_output: dict[str, Any] | None = None,
    evidence_verifier: EvidenceVerifier | None = None,
    case_id: str | None = None,
    context: dict[str, Any] | None = None,
) -> Stage3Output:
    """Execute Stage 3: Deep reasoning analysis.

    Args:
        stage1_output: Stage 1 output as dict.
        client: NIM API client instance.
        stage2_output: Optional Stage 2 output.
        evidence_verifier: Optional evidence verifier.
        case_id: Optional case ID for context.
        context: Optional additional context.

    Returns:
        Stage3Output with analysis, final claims, evidence chains, patterns.
    """
    logger.info("[STAGE-3] Running deep reasoning")

    user_message = _build_user_message(stage1_output, stage2_output)

    try:
        response = await client.chat(
            model=Models.DEEP_REASONING,
            messages=[
                {"role": "system", "content": STAGE3_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,  # Very low temperature for deterministic reasoning
            max_tokens=3072,  # More tokens for chain-of-thought
        )

        output = _parse_response(response.content)

        # Verify final claims if verifier provided
        if evidence_verifier and output.final_claims:
            claim_objects = [
                Claim(
                    id=f"s3_{i}",
                    text=c.get("text", ""),
                    source_hint=str(c.get("evidence_chain", [])),
                    confidence=c.get("confidence", 0.0),
                    stage=3,
                )
                for i, c in enumerate(output.final_claims)
            ]
            output.verification = await evidence_verifier.verify_claims(
                claim_objects, case_id, context
            )
            logger.info(
                "[STAGE-3] Verification: %d/%d final claims passed (%.0f%%)",
                len(output.verification.verified_claims),
                output.verification.total_claims,
                output.verification.pass_rate * 100,
            )

        return output

    except NimError as e:
        logger.error("[STAGE-3] NIM API error: %s", str(e))
        return Stage3Output(
            raw_text=f"Error: {str(e)}",
            analysis=f"Stage 3 deep reasoning failed: {str(e)}",
        )
    except Exception as e:
        logger.error("[STAGE-3] Unexpected error: %s", str(e))
        return Stage3Output(
            raw_text=f"Error: {str(e)}",
            analysis=f"Stage 3 deep reasoning failed: {str(e)}",
        )


def _build_user_message(
    stage1: dict[str, Any],
    stage2: dict[str, Any] | None,
) -> str:
    """Build user message with Stage 1 + Stage 2 outputs."""
    parts = ["=== INVESTIGATION DATA FOR DEEP REASONING ===\n"]

    # Stage 1
    parts.append("--- Stage 1: Initial Draft ---")
    if stage1.get("hypothesis"):
        parts.append(f"Hypothesis: {stage1['hypothesis']}")
    if stage1.get("claims"):
        parts.append("Claims:")
        for i, c in enumerate(stage1["claims"][:8]):
            parts.append(
                f"  [{i}] {c.get('text', str(c))} "
                f"(confidence: {c.get('confidence', '?')})"
            )
    if stage1.get("entities"):
        parts.append("Entities:")
        for e in stage1["entities"][:6]:
            parts.append(f"  - {e.get('name', '?')} ({e.get('type', '?')})")
    parts.append("")

    # Stage 2
    if stage2:
        parts.append("--- Stage 2: Critical Review ---")
        if stage2.get("critique"):
            parts.append(f"Critique: {stage2['critique']}")
        if stage2.get("revised_claims"):
            parts.append("Revised Claims:")
            for i, c in enumerate(stage2["revised_claims"][:6]):
                parts.append(
                    f"  [{i}] {c.get('text', str(c))} "
                    f"(confidence: {c.get('confidence', '?')}, "
                    f"revision: {c.get('revision_type', '?')})"
                )
        if stage2.get("weaknesses"):
            parts.append("Identified Weaknesses:")
            for w in stage2["weaknesses"][:5]:
                parts.append(f"  - {w}")
        if stage2.get("alternative_hypotheses"):
            parts.append("Alternative Hypotheses:")
            for h in stage2["alternative_hypotheses"][:3]:
                parts.append(f"  - {h}")
        parts.append("")

    parts.append("=== PERFORM DEEP CHAIN-OF-THOUGHT REASONING ===")
    return "\n".join(parts)


def _parse_response(raw_text: str) -> Stage3Output:
    """Parse the JSON response from the LLM."""
    output = Stage3Output(raw_text=raw_text)

    json_match = re.search(r"\{[\s\S]*\}", raw_text)
    if not json_match:
        logger.warning("[STAGE-3] No JSON found in response")
        output.analysis = raw_text
        return output

    try:
        data = json.loads(json_match.group())

        output.analysis = data.get("analysis", "")
        output.final_claims = data.get("final_claims", [])
        output.evidence_chains = data.get("evidence_chains", [])
        output.patterns_detected = data.get("patterns_detected", [])
        output.confidence_adjustments = data.get("confidence_adjustments", [])

        # Validate structure
        for i, claim in enumerate(output.final_claims):
            if "text" not in claim:
                logger.warning("[STAGE-3] Final claim %d missing 'text'", i)
                claim["text"] = str(claim)
            if "confidence" not in claim:
                claim["confidence"] = 0.5

    except json.JSONDecodeError as e:
        logger.warning("[STAGE-3] Failed to parse JSON: %s", e)
        output.analysis = raw_text

    return output
