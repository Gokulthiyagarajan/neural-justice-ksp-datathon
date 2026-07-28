"""Pipeline Stage 1: Draft Investigation Report.

Uses GPT-OSS-120B to generate an initial draft investigation report
from the officer's query. Outputs structured claims, entities, and hypothesis.
Claims are then passed through the evidence verifier before forwarding.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from backend.pipeline.nim_client import NimClient, Models, NimError
from backend.pipeline.evidence_verifier import Claim, EvidenceVerifier, VerificationResult

logger = logging.getLogger("nj.pipeline.stage_1")


# ── Data types ─────────────────────────────────────────────────────────────


@dataclass
class Stage1Output:
    """Output from Stage 1 generation."""

    raw_text: str = ""
    claims: list[dict[str, Any]] = field(default_factory=list)
    entities: list[dict[str, Any]] = field(default_factory=list)
    hypothesis: str = ""
    verification: VerificationResult | None = None

    @property
    def verified_claims(self) -> list[Claim]:
        """Claims that passed verification."""
        if self.verification is None:
            return [Claim(id=str(i), text=c.get("text", "")) for i, c in enumerate(self.claims)]
        return [v.claim for v in self.verification.verified_claims]

    @property
    def pass_rate(self) -> float:
        if self.verification is None:
            return 1.0
        return self.verification.pass_rate


# ── System prompt ──────────────────────────────────────────────────────────

STAGE1_SYSTEM_PROMPT = """You are a criminal investigation analyst for the Karnataka State Police (KSP).

Your task: Given an officer's query, generate a structured investigation draft.

RESPOND IN VALID JSON ONLY. No markdown, no prose outside JSON.

Output format:
{
  "claims": [
    {
      "text": "Specific factual claim to investigate",
      "confidence": 0.0-1.0,
      "type": "factual|inferential|recommendation",
      "source_hint": "database|pattern|reasoning"
    }
  ],
  "entities": [
    {
      "name": "Entity name",
      "type": "person|location|crime|date|station|vehicle|evidence",
      "relevance": "high|medium|low"
    }
  ],
  "hypothesis": "One-paragraph working hypothesis based on available data"
}

RULES:
- Claims must be specific and verifiable (not vague generalizations)
- Maximum 8 claims per response
- Maximum 6 entities
- Mark confidence honestly (0.3 = uncertain, 0.7 = likely, 0.9 = very likely)
- If data is insufficient, say so in the hypothesis
- Always link claims to Karnataka/India context
"""


# ── Stage 1 runner ─────────────────────────────────────────────────────────


async def run_stage_1(
    query: str,
    client: NimClient,
    evidence_verifier: EvidenceVerifier | None = None,
    case_id: str | None = None,
    context: dict[str, Any] | None = None,
) -> Stage1Output:
    """Execute Stage 1: Generate draft investigation report.

    Args:
        query: Officer's raw query text.
        client: NIM API client instance.
        evidence_verifier: Optional evidence verifier for claim checking.
        case_id: Optional case ID for context.
        context: Optional additional context.

    Returns:
        Stage1Output with claims, entities, hypothesis, and verification result.
    """
    logger.info("[STAGE-1] Generating draft for query: %s", query[:80])

    user_message = _build_user_message(query, case_id, context)

    try:
        response = await client.chat(
            model=Models.GENERATION,
            messages=[
                {"role": "system", "content": STAGE1_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=2048,
        )

        output = _parse_response(response.content)

        # Verify claims if verifier provided
        if evidence_verifier and output.claims:
            claim_objects = [
                Claim(
                    id=f"s1_{i}",
                    text=c.get("text", ""),
                    source_hint=c.get("source_hint", ""),
                    confidence=c.get("confidence", 0.0),
                    stage=1,
                )
                for i, c in enumerate(output.claims)
            ]
            output.verification = await evidence_verifier.verify_claims(
                claim_objects, case_id, context
            )
            logger.info(
                "[STAGE-1] Verification: %d/%d claims passed (%.0f%%)",
                len(output.verification.verified_claims),
                output.verification.total_claims,
                output.verification.pass_rate * 100,
            )

        return output

    except NimError as e:
        logger.error("[STAGE-1] NIM API error: %s", str(e))
        return Stage1Output(
            raw_text=f"Error: {str(e)}",
            hypothesis=f"Stage 1 generation failed: {str(e)}",
        )
    except Exception as e:
        logger.error("[STAGE-1] Unexpected error: %s", str(e))
        return Stage1Output(
            raw_text=f"Error: {str(e)}",
            hypothesis=f"Stage 1 generation failed: {str(e)}",
        )


def _build_user_message(
    query: str, case_id: str | None, context: dict[str, Any] | None
) -> str:
    """Build the user message with context."""
    parts = [f"Officer Query: {query}"]

    if case_id:
        parts.append(f"Case ID: {case_id}")

    if context:
        if context.get("district"):
            parts.append(f"District: {context['district']}")
        if context.get("station"):
            parts.append(f"Station: {context['station']}")
        if context.get("officer_role"):
            parts.append(f"Officer Role: {context['officer_role']}")

    parts.append("\nGenerate the investigation draft as JSON.")
    return "\n".join(parts)


def _parse_response(raw_text: str) -> Stage1Output:
    """Parse the JSON response from the LLM."""
    output = Stage1Output(raw_text=raw_text)

    # Try to extract JSON from the response
    json_match = re.search(r"\{[\s\S]*\}", raw_text)
    if not json_match:
        logger.warning("[STAGE-1] No JSON found in response")
        output.hypothesis = raw_text
        return output

    try:
        data = json.loads(json_match.group())

        output.claims = data.get("claims", [])
        output.entities = data.get("entities", [])
        output.hypothesis = data.get("hypothesis", "")

        # Validate structure
        for i, claim in enumerate(output.claims):
            if "text" not in claim:
                logger.warning("[STAGE-1] Claim %d missing 'text' field", i)
                claim["text"] = str(claim)
            if "confidence" not in claim:
                claim["confidence"] = 0.5

    except json.JSONDecodeError as e:
        logger.warning("[STAGE-1] Failed to parse JSON: %s", e)
        output.hypothesis = raw_text

    return output
