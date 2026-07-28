"""Pipeline Stage 2: Critical Review.

Uses Nemotron Ultra to stress-test Stage 1 claims, identify weaknesses,
and propose alternative hypotheses. Only runs in deep mode.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from backend.pipeline.nim_client import NimClient, Models, NimError
from backend.pipeline.evidence_verifier import Claim, EvidenceVerifier, VerificationResult

logger = logging.getLogger("nj.pipeline.stage_2")


# ── Data types ─────────────────────────────────────────────────────────────


@dataclass
class Stage2Output:
    """Output from Stage 2 critical review."""

    raw_text: str = ""
    critique: str = ""
    revised_claims: list[dict[str, Any]] = field(default_factory=list)
    alternative_hypotheses: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    verification: VerificationResult | None = None


# ── System prompt ──────────────────────────────────────────────────────────

STAGE2_SYSTEM_PROMPT = """You are a senior criminal investigation reviewer for the Karnataka State Police.

Your task: Critically review the initial investigation draft and stress-test every claim.

RESPOND IN VALID JSON ONLY. No markdown, no prose outside JSON.

Output format:
{
  "critique": "One paragraph critical assessment of the initial draft",
  "revised_claims": [
    {
      "text": "Revised or new claim based on critical review",
      "confidence": 0.0-1.0,
      "type": "factual|inferential|recommendation",
      "revision_type": "strengthened|weakened|new|unchanged",
      "reasoning": "Why this revision was made"
    }
  ],
  "alternative_hypotheses": [
    "Alternative explanation that should be considered"
  ],
  "weaknesses": [
    "Specific weakness or gap in the initial analysis"
  ]
}

RULES:
- Be adversarial: find every possible flaw in the initial draft
- Maximum 6 revised claims
- Maximum 3 alternative hypotheses
- Maximum 5 weaknesses
- If the initial draft is solid, say so — don't invent weaknesses
- Focus on evidence gaps, logical leaps, and confirmation bias
- Every revised claim must have a reasoning field
"""


# ── Stage 2 runner ─────────────────────────────────────────────────────────


async def run_stage_2(
    stage1_output: dict[str, Any],
    client: NimClient,
    evidence_verifier: EvidenceVerifier | None = None,
    case_id: str | None = None,
    context: dict[str, Any] | None = None,
) -> Stage2Output:
    """Execute Stage 2: Critical review of Stage 1 output.

    Args:
        stage1_output: Stage 1 output as dict (claims, entities, hypothesis).
        client: NIM API client instance.
        evidence_verifier: Optional evidence verifier for claim checking.
        case_id: Optional case ID for context.
        context: Optional additional context.

    Returns:
        Stage2Output with critique, revised claims, alternatives, weaknesses.
    """
    logger.info("[STAGE-2] Running critical review")

    user_message = _build_user_message(stage1_output)

    try:
        response = await client.chat(
            model=Models.CRITICAL_REVIEW,
            messages=[
                {"role": "system", "content": STAGE2_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,  # Low temperature for critical analysis
            max_tokens=2048,
        )

        output = _parse_response(response.content)

        # Verify revised claims if verifier provided
        if evidence_verifier and output.revised_claims:
            claim_objects = [
                Claim(
                    id=f"s2_{i}",
                    text=c.get("text", ""),
                    source_hint=c.get("reasoning", ""),
                    confidence=c.get("confidence", 0.0),
                    stage=2,
                )
                for i, c in enumerate(output.revised_claims)
            ]
            output.verification = await evidence_verifier.verify_claims(
                claim_objects, case_id, context
            )
            logger.info(
                "[STAGE-2] Verification: %d/%d revised claims passed (%.0f%%)",
                len(output.verification.verified_claims),
                output.verification.total_claims,
                output.verification.pass_rate * 100,
            )

        return output

    except NimError as e:
        logger.error("[STAGE-2] NIM API error: %s", str(e))
        return Stage2Output(
            raw_text=f"Error: {str(e)}",
            critique=f"Stage 2 critical review failed: {str(e)}",
        )
    except Exception as e:
        logger.error("[STAGE-2] Unexpected error: %s", str(e))
        return Stage2Output(
            raw_text=f"Error: {str(e)}",
            critique=f"Stage 2 critical review failed: {str(e)}",
        )


def _build_user_message(stage1: dict[str, Any]) -> str:
    """Build user message with Stage 1 output."""
    parts = ["=== INITIAL INVESTIGATION DRAFT TO REVIEW ===\n"]

    if stage1.get("hypothesis"):
        parts.append(f"Hypothesis: {stage1['hypothesis']}")
    parts.append("")

    if stage1.get("claims"):
        parts.append("Claims:")
        for i, c in enumerate(stage1["claims"][:8]):
            parts.append(
                f"  [{i}] {c.get('text', str(c))} "
                f"(confidence: {c.get('confidence', '?')}, type: {c.get('type', '?')})"
            )
    parts.append("")

    if stage1.get("entities"):
        parts.append("Entities:")
        for e in stage1["entities"][:6]:
            parts.append(f"  - {e.get('name', '?')} ({e.get('type', '?')})")
    parts.append("")

    parts.append("=== CRITICALLY REVIEW THIS DRAFT ===")
    return "\n".join(parts)


def _parse_response(raw_text: str) -> Stage2Output:
    """Parse the JSON response from the LLM."""
    output = Stage2Output(raw_text=raw_text)

    json_match = re.search(r"\{[\s\S]*\}", raw_text)
    if not json_match:
        logger.warning("[STAGE-2] No JSON found in response")
        output.critique = raw_text
        return output

    try:
        data = json.loads(json_match.group())

        output.critique = data.get("critique", "")
        output.revised_claims = data.get("revised_claims", [])
        output.alternative_hypotheses = data.get("alternative_hypotheses", [])
        output.weaknesses = data.get("weaknesses", [])

        # Validate structure
        for i, claim in enumerate(output.revised_claims):
            if "text" not in claim:
                logger.warning("[STAGE-2] Revised claim %d missing 'text'", i)
                claim["text"] = str(claim)
            if "confidence" not in claim:
                claim["confidence"] = 0.5

    except json.JSONDecodeError as e:
        logger.warning("[STAGE-2] Failed to parse JSON: %s", e)
        output.critique = raw_text

    return output
