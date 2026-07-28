"""Final Report Engine — Deterministic Python (NOT LLM).

Assembles the final structured JSON report from all stage outputs.
No LLM calls — pure deterministic code. Produces the report that
gets returned to the investigator.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from backend.pipeline.evidence_verifier import VerificationResult, VerificationStatus

logger = logging.getLogger("nj.pipeline.final_engine")


# ── Data types ─────────────────────────────────────────────────────────────


@dataclass
class FinalReport:
    """The final investigation report."""

    # Metadata
    report_id: str = ""
    query: str = ""
    mode: str = "fast"
    generated_at: str = ""
    processing_time_ms: float = 0.0

    # Executive summary
    executive_summary: str = ""
    hypothesis: str = ""

    # Claims breakdown
    verified_claims: list[dict[str, Any]] = field(default_factory=list)
    unverified_claims: list[dict[str, Any]] = field(default_factory=list)
    contradicted_claims: list[dict[str, Any]] = field(default_factory=list)

    # Entities
    entities: list[dict[str, Any]] = field(default_factory=list)

    # Evidence chain
    evidence_summary: dict[str, Any] = field(default_factory=dict)

    # Consistency
    consistency_score: float = 0.0
    cross_references: list[dict[str, Any]] = field(default_factory=list)

    # Recommendations
    recommendations: list[str] = field(default_factory=list)

    # Stage metadata
    stages_completed: list[str] = field(default_factory=list)
    total_claims_generated: int = 0
    total_claims_verified: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to serializable dict."""
        return {
            "report_id": self.report_id,
            "query": self.query,
            "mode": self.mode,
            "generated_at": self.generated_at,
            "processing_time_ms": self.processing_time_ms,
            "executive_summary": self.executive_summary,
            "hypothesis": self.hypothesis,
            "claims": {
                "verified": self.verified_claims,
                "unverified": self.unverified_claims,
                "contradicted": self.contradicted_claims,
                "total_generated": self.total_claims_generated,
                "total_verified": self.total_claims_verified,
                "pass_rate": (
                    self.total_claims_verified / self.total_claims_generated
                    if self.total_claims_generated > 0 else 1.0
                ),
            },
            "entities": self.entities,
            "evidence_summary": self.evidence_summary,
            "consistency": {
                "score": self.consistency_score,
                "cross_references": self.cross_references,
            },
            "recommendations": self.recommendations,
            "stages_completed": self.stages_completed,
        }


# ── Final Report Builder ───────────────────────────────────────────────────


def build_final_report(
    query: str,
    mode: str,
    stage1_output: dict[str, Any] | None = None,
    stage2_output: dict[str, Any] | None = None,
    stage3_output: dict[str, Any] | None = None,
    stage4_output: dict[str, Any] | None = None,
    verification: VerificationResult | None = None,
    processing_time_ms: float = 0.0,
    report_id: str = "",
) -> FinalReport:
    """Build the final report from all stage outputs.

    This is DETERMINISTIC — no LLM calls, no randomness.
    Just structured assembly of verified data.

    Args:
        query: Original officer query.
        mode: Pipeline mode ("fast" or "deep").
        stage1_output: Stage 1 output dict.
        stage2_output: Stage 2 output dict (deep mode only).
        stage3_output: Stage 3 output dict (deep mode only).
        stage4_output: Stage 4 output dict.
        verification: Evidence verification result from the final stage.
        processing_time_ms: Total pipeline processing time.
        report_id: Unique report identifier.

    Returns:
        FinalReport with all fields populated.
    """
    report = FinalReport(
        report_id=report_id or f"RPT-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        query=query,
        mode=mode,
        generated_at=datetime.now(timezone.utc).isoformat(),
        processing_time_ms=processing_time_ms,
    )

    # Track which stages completed
    stages = []
    if stage1_output:
        stages.append("stage_1_generation")
    if stage2_output:
        stages.append("stage_2_critical_review")
    if stage3_output:
        stages.append("stage_3_deep_reasoning")
    if stage4_output:
        stages.append("stage_4_consistency")
    stages.append("final_assembly")
    report.stages_completed = stages

    # Extract hypothesis from the most advanced stage available
    report.hypothesis = _extract_hypothesis(stage3_output or stage2_output or stage1_output)

    # Extract entities
    report.entities = _extract_entities(stage1_output)

    # Process claims through verification
    _process_claims(report, stage1_output, stage2_output, stage3_output, verification)

    # Consistency from Stage 4
    if stage4_output:
        report.consistency_score = stage4_output.get("consistency_score", 0.0)
        report.cross_references = stage4_output.get("cross_references", [])
        report.recommendations = stage4_output.get("recommendations", [])

    # Build evidence summary
    report.evidence_summary = _build_evidence_summary(verification)

    # Generate executive summary
    report.executive_summary = _generate_executive_summary(report)

    # If no recommendations from Stage 4, generate defaults
    if not report.recommendations:
        report.recommendations = _generate_default_recommendations(report)

    logger.info(
        "[FINAL] Report assembled: %d verified, %d unverified, %d contradicted (pass rate: %.0f%%)",
        len(report.verified_claims),
        len(report.unverified_claims),
        len(report.contradicted_claims),
        (report.total_claims_verified / report.total_claims_generated * 100)
        if report.total_claims_generated > 0 else 100,
    )

    return report


# ── Helper functions ────────────────────────────────────────────────────────


def _extract_hypothesis(stage_output: dict[str, Any] | None) -> str:
    """Extract hypothesis from the most advanced stage."""
    if not stage_output:
        return "Insufficient data to form hypothesis."

    # Try different keys depending on stage
    for key in ("hypothesis", "analysis", "critique", "final_analysis"):
        if stage_output.get(key):
            return stage_output[key]

    return "Hypothesis not available from pipeline stages."


def _extract_entities(stage1_output: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Extract entities from Stage 1 output."""
    if not stage1_output:
        return []
    return stage1_output.get("entities", [])


def _process_claims(
    report: FinalReport,
    stage1: dict[str, Any] | None,
    stage2: dict[str, Any] | None,
    stage3: dict[str, Any] | None,
    verification: VerificationResult | None,
) -> None:
    """Process and categorize claims by verification status."""

    # Use the most advanced stage's claims
    claims = []
    source_stage = None

    if stage3 and stage3.get("final_claims"):
        claims = stage3["final_claims"]
        source_stage = "stage_3"
    elif stage2 and stage2.get("revised_claims"):
        claims = stage2["revised_claims"]
        source_stage = "stage_2"
    elif stage1 and stage1.get("claims"):
        claims = stage1["claims"]
        source_stage = "stage_1"

    report.total_claims_generated = len(claims)

    if verification:
        # Use verification results to categorize
        verified_ids = {v.claim.id for v in verification.verified_claims}
        dropped_ids = {v.claim.id for v in verification.dropped_claims}

        for i, claim in enumerate(claims):
            claim_id = f"{source_stage}_{i}" if source_stage else str(i)
            claim_dict = {
                "text": claim.get("text", str(claim)),
                "confidence": claim.get("confidence", 0.5),
                "type": claim.get("type", "unknown"),
                "source_hint": claim.get("source_hint", "unknown"),
                "source_stage": source_stage,
            }

            if claim_id in dropped_ids:
                # Find the drop reason
                dropped = next(
                    (v for v in verification.dropped_claims if v.claim.id == claim_id),
                    None,
                )
                claim_dict["contradicted_reason"] = (
                    dropped.contradicted_reason if dropped else "Evidence contradicts claim"
                )
                report.contradicted_claims.append(claim_dict)
            elif claim_id in verified_ids:
                # Find the verification details
                verified = next(
                    (v for v in verification.verified_claims if v.claim.id == claim_id),
                    None,
                )
                if verified:
                    claim_dict["evidence_source"] = verified.evidence_source
                    claim_dict["evidence_detail"] = verified.evidence_detail
                report.verified_claims.append(claim_dict)
                report.total_claims_verified += 1
            else:
                report.unverified_claims.append(claim_dict)
    else:
        # No verification — all claims are unverified
        for claim in claims:
            report.unverified_claims.append({
                "text": claim.get("text", str(claim)),
                "confidence": claim.get("confidence", 0.5),
                "type": claim.get("type", "unknown"),
                "source_hint": claim.get("source_hint", "unknown"),
                "source_stage": source_stage,
            })


def _build_evidence_summary(verification: VerificationResult | None) -> dict[str, Any]:
    """Build evidence summary from verification result."""
    if not verification:
        return {"status": "no_verification_performed"}

    return {
        "total_claims": verification.total_claims,
        "verified_internal": verification.verified_count,
        "verified_external": verification.external_count,
        "unverified": verification.unverified_count,
        "contradicted": verification.contradicted_count,
        "pass_rate": verification.pass_rate,
    }


def _generate_executive_summary(report: FinalReport) -> str:
    """Generate a deterministic executive summary."""
    parts = []

    # Opening
    parts.append(f"Investigation analysis completed for query: \"{report.query}\"")
    parts.append(f"Pipeline mode: {report.mode} ({len(report.stages_completed)} stages)")

    # Claims summary
    total = report.total_claims_generated
    verified = len(report.verified_claims)
    unverified = len(report.unverified_claims)
    contradicted = len(report.contradicted_claims)

    if total > 0:
        pass_rate = (verified / total * 100) if total > 0 else 0
        parts.append(
            f"Claims analysis: {verified} verified ({pass_rate:.0f}%), "
            f"{unverified} unverified, {contradicted} contradicted "
            f"out of {total} total claims generated."
        )
    else:
        parts.append("No claims were generated from the analysis.")

    # Hypothesis
    if report.hypothesis:
        parts.append(f"\nWorking hypothesis: {report.hypothesis}")

    # Consistency
    if report.consistency_score > 0:
        parts.append(
            f"\nCross-stage consistency score: {report.consistency_score:.1%}"
        )

    return "\n".join(parts)


def _generate_default_recommendations(report: FinalReport) -> list[str]:
    """Generate default recommendations based on report content."""
    recs = []

    if report.contradicted_claims:
        recs.append(
            f"Investigate {len(report.contradicted_claims)} contradicted claims — "
            "evidence conflicts with initial analysis."
        )

    if report.unverified_claims:
        recs.append(
            f"Corroborate {len(report.unverified_claims)} unverified claims "
            "with additional evidence sources."
        )

    if not report.verified_claims and report.total_claims_generated > 0:
        recs.append("No claims verified — recommend manual review of all findings.")

    if report.consistency_score < 0.5:
        recs.append(
            "Low consistency score detected — review cross-stage findings for contradictions."
        )

    if not recs:
        recs.append("Report appears consistent. Proceed with standard investigation protocol.")

    return recs
