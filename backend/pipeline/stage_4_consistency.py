"""Pipeline Stage 4: Consistency Check.

Uses Nemotron Mini 4B to validate cross-stage consistency.
Checks that claims across stages don't contradict each other,
identifies gaps, and produces consistency score + recommendations.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from backend.pipeline.nim_client import NimClient, Models, NimError

logger = logging.getLogger("nj.pipeline.stage_4")


# ── Data types ─────────────────────────────────────────────────────────────


@dataclass
class Stage4Output:
    """Output from Stage 4 consistency check."""

    raw_text: str = ""
    consistency_score: float = 0.0
    cross_references: list[dict[str, Any]] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    is_consistent: bool = True


# ── System prompt ──────────────────────────────────────────────────────────

STAGE4_SYSTEM_PROMPT = """You are a consistency validation engine for criminal investigation reports.

Your task: Review investigation reports from multiple stages and check for internal consistency.

RESPOND IN VALID JSON ONLY. No markdown, no prose outside JSON.

Output format:
{
  "consistency_score": 0.0-1.0,
  "cross_references": [
    {
      "claim_ids": ["s1_0", "s2_1"],
      "relationship": "supports|contradicts|extends|unrelated",
      "detail": "Description of the relationship"
    }
  ],
  "gaps": [
    "Description of missing information or logical gaps"
  ],
  "recommendations": [
    "Specific actionable recommendation for the investigator"
  ],
  "is_consistent": true/false
}

SCORING:
- 1.0 = All stages fully consistent, no contradictions
- 0.7-0.9 = Minor inconsistencies, mostly consistent
- 0.4-0.6 = Notable gaps or weak contradictions
- 0.0-0.3 = Major contradictions, report needs revision

RULES:
- Flag any claim that appears in Stage 1 but is contradicted by later stages
- Identify claims that lack supporting evidence from any stage
- Maximum 5 cross-references
- Maximum 5 gaps
- Maximum 5 recommendations
- Focus on factual consistency, not style or formatting
"""


# ── Stage 4 runner ─────────────────────────────────────────────────────────


async def run_stage_4(
    stage1_output: dict[str, Any],
    client: NimClient,
    stage2_output: dict[str, Any] | None = None,
    stage3_output: dict[str, Any] | None = None,
) -> Stage4Output:
    """Execute Stage 4: Consistency check across stages.

    Args:
        stage1_output: Stage 1 output as dict (claims, entities, hypothesis).
        client: NIM API client instance.
        stage2_output: Optional Stage 2 output (deep mode).
        stage3_output: Optional Stage 3 output (deep mode).

    Returns:
        Stage4Output with consistency score, cross-references, gaps, recommendations.
    """
    logger.info("[STAGE-4] Running consistency check")

    user_message = _build_user_message(stage1_output, stage2_output, stage3_output)

    try:
        response = await client.chat(
            model=Models.CONSISTENCY,
            messages=[
                {"role": "system", "content": STAGE4_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,  # Low temperature for consistency checking
            max_tokens=1024,
        )

        return _parse_response(response.content)

    except NimError as e:
        logger.error("[STAGE-4] NIM API error: %s", str(e))
        return Stage4Output(
            raw_text=f"Error: {str(e)}",
            consistency_score=0.5,
            is_consistent=True,  # Don't block on errors
            gaps=[f"Consistency check failed: {str(e)}"],
        )
    except Exception as e:
        logger.error("[STAGE-4] Unexpected error: %s", str(e))
        return Stage4Output(
            raw_text=f"Error: {str(e)}",
            consistency_score=0.5,
            is_consistent=True,
            gaps=[f"Consistency check failed: {str(e)}"],
        )


def _build_user_message(
    stage1: dict[str, Any],
    stage2: dict[str, Any] | None,
    stage3: dict[str, Any] | None,
) -> str:
    """Build user message with all stage outputs."""
    parts = ["=== INVESTIGATION REPORT STAGES ===\n"]

    # Stage 1
    parts.append("--- Stage 1: Draft Investigation Report ---")
    if stage1.get("hypothesis"):
        parts.append(f"Hypothesis: {stage1['hypothesis']}")
    if stage1.get("claims"):
        parts.append("Claims:")
        for i, c in enumerate(stage1["claims"][:8]):
            parts.append(f"  [{i}] {c.get('text', str(c))} (conf: {c.get('confidence', '?')})")
    parts.append("")

    # Stage 2 (deep mode)
    if stage2:
        parts.append("--- Stage 2: Critical Review ---")
        if stage2.get("critique"):
            parts.append(f"Critique: {stage2['critique']}")
        if stage2.get("revised_claims"):
            parts.append("Revised Claims:")
            for i, c in enumerate(stage2["revised_claims"][:8]):
                parts.append(f"  [{i}] {c.get('text', str(c))}")
        parts.append("")

    # Stage 3 (deep mode)
    if stage3:
        parts.append("--- Stage 3: Deep Reasoning ---")
        if stage3.get("analysis"):
            parts.append(f"Analysis: {stage3['analysis']}")
        if stage3.get("final_claims"):
            parts.append("Final Claims:")
            for i, c in enumerate(stage3["final_claims"][:8]):
                parts.append(f"  [{i}] {c.get('text', str(c))}")
        parts.append("")

    parts.append("=== CHECK CONSISTENCY ACROSS ALL STAGES ===")
    return "\n".join(parts)


def _parse_response(raw_text: str) -> Stage4Output:
    """Parse the JSON response from the LLM."""
    output = Stage4Output(raw_text=raw_text)

    json_match = re.search(r"\{[\s\S]*\}", raw_text)
    if not json_match:
        logger.warning("[STAGE-4] No JSON found in response")
        output.gaps.append("Failed to parse consistency check response")
        return output

    try:
        data = json.loads(json_match.group())

        output.consistency_score = float(data.get("consistency_score", 0.5))
        output.cross_references = data.get("cross_references", [])
        output.gaps = data.get("gaps", [])
        output.recommendations = data.get("recommendations", [])
        output.is_consistent = bool(data.get("is_consistent", True))

    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("[STAGE-4] Failed to parse JSON: %s", e)
        output.gaps.append(f"Failed to parse consistency response: {e}")

    return output
