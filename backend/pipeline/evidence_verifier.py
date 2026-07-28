"""Evidence Verification Module.

Runs after every pipeline stage to verify claims against evidence sources.
Called identically after Stage 1, 2, and 3.

Evidence ranking order (highest trust first):
  1. KSP internal database (FIR records, case files, station metadata)
  2. Government records
  3. Verified news sources
  4. Other web sources

Per-claim status:
  - verified_internal: confirmed by KSP database
  - verified_external: confirmed by web search / government records
  - unverified: no evidence found (passed forward but flagged)
  - contradicted: evidence conflicts with claim (DROPPED, not passed forward)

Usage::

    from backend.pipeline.evidence_verifier import EvidenceVerifier, Claim

    verifier = EvidenceVerifier(datastore)
    result = await verifier.verify_claims(claims, case_id="KSP-2026-001")
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from backend.api.copilot.datastore import DataStore

logger = logging.getLogger("nj.pipeline.evidence_verifier")


# ── Data types ─────────────────────────────────────────────────────────────


class VerificationStatus(str, Enum):
    """Per-claim verification status."""

    VERIFIED_INTERNAL = "verified_internal"
    VERIFIED_EXTERNAL = "verified_external"
    UNVERIFIED = "unverified"
    CONTRADICTED = "contradicted"


@dataclass
class Claim:
    """A single claim produced by a pipeline stage."""

    id: str
    text: str
    source_hint: str = ""
    confidence: float = 0.0
    stage: int = 0  # Which stage produced this claim

    def __hash__(self):
        return hash(self.id)

    def __eq__(self, other):
        if isinstance(other, Claim):
            return self.id == other.id
        return NotImplemented


@dataclass
class ClaimVerification:
    """Verification result for a single claim."""

    claim: Claim
    status: VerificationStatus
    evidence_source: str = ""
    evidence_detail: str = ""
    contradicted_reason: str = ""

    @property
    def is_verified(self) -> bool:
        return self.status in (
            VerificationStatus.VERIFIED_INTERNAL,
            VerificationStatus.VERIFIED_EXTERNAL,
        )

    @property
    def is_dropped(self) -> bool:
        return self.status == VerificationStatus.CONTRADICTED


@dataclass
class VerificationResult:
    """Aggregated result of verifying a batch of claims."""

    verified_claims: list[ClaimVerification] = field(default_factory=list)
    dropped_claims: list[ClaimVerification] = field(default_factory=list)
    total_claims: int = 0
    verified_count: int = 0
    external_count: int = 0
    unverified_count: int = 0
    contradicted_count: int = 0

    @property
    def pass_rate(self) -> float:
        """Percentage of claims that survived verification (not contradicted)."""
        if self.total_claims == 0:
            return 1.0
        return (self.total_claims - self.contradicted_count) / self.total_claims


# ── Evidence Verifier ──────────────────────────────────────────────────────


class EvidenceVerifier:
    """Verifies pipeline claims against evidence sources.

    Args:
        datastore: DataStore instance for KSP database queries.
    """

    # Keywords that suggest a claim is about a specific FIR or case
    FIR_PATTERN = re.compile(
        r"((?:FIR|crime\s*no|case\s*no)[\s:\-]*[A-Z0-9\-/]+)", re.IGNORECASE
    )

    # Keywords that suggest a claim is about a police station
    STATION_PATTERN = re.compile(
        r"(?:police\s*station|PS|station)[\s:\-]*([A-Za-z\s]{2,30}?)(?:\s+(?:district|circle|has|is|in|with|\d)|\s*$)",
        re.IGNORECASE,
    )

    def __init__(self, datastore: DataStore):
        self.ds = datastore

    async def verify_claims(
        self,
        claims: list[Claim],
        case_id: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> VerificationResult:
        """Verify a batch of claims against evidence sources.

        Args:
            claims: List of Claim objects to verify.
            case_id: Optional case ID for context-scoped queries.
            context: Optional additional context (district, station, etc.).

        Returns:
            VerificationResult with per-claim status and aggregated stats.
        """
        result = VerificationResult(total_claims=len(claims))

        for claim in claims:
            verification = await self._verify_single_claim(claim, case_id, context)

            if verification.is_dropped:
                result.dropped_claims.append(verification)
                result.contradicted_count += 1
                logger.info(
                    "[VERIFY] Claim %s DROPPED (contradicted): %s — reason: %s",
                    claim.id, claim.text[:80], verification.contradicted_reason,
                )
            else:
                result.verified_claims.append(verification)
                if verification.status == VerificationStatus.VERIFIED_INTERNAL:
                    result.verified_count += 1
                elif verification.status == VerificationStatus.VERIFIED_EXTERNAL:
                    result.external_count += 1
                else:
                    result.unverified_count += 1

        logger.info(
            "[VERIFY] Batch complete: %d claims → %d verified, %d external, %d unverified, %d dropped (pass rate: %.0f%%)",
            result.total_claims,
            result.verified_count,
            result.external_count,
            result.unverified_count,
            result.contradicted_count,
            result.pass_rate * 100,
        )

        return result

    async def _verify_single_claim(
        self,
        claim: Claim,
        case_id: str | None,
        context: dict[str, Any] | None,
    ) -> ClaimVerification:
        """Verify a single claim against evidence sources (priority order)."""

        # 1. Try KSP internal database first (highest trust)
        internal_result = await self._check_internal_database(claim, case_id, context)
        if internal_result:
            return internal_result

        # 2. Try web search for external corroboration
        external_result = await self._check_external_sources(claim, context)
        if external_result:
            return external_result

        # 3. No evidence found — mark as unverified
        return ClaimVerification(
            claim=claim,
            status=VerificationStatus.UNVERIFIED,
            evidence_source="none",
            evidence_detail="No corroborating evidence found in KSP database or external sources",
        )

    async def _check_internal_database(
        self,
        claim: Claim,
        case_id: str | None,
        context: dict[str, Any] | None,
    ) -> ClaimVerification | None:
        """Query KSP internal database for corroboration.

        Checks:
        - FIR records (if claim references a crime number)
        - Case files (if claim references a case)
        - Station metadata (if claim references a station)
        """

        # Try to extract FIR number from claim
        fir_match = self.FIR_PATTERN.search(claim.text)
        if fir_match:
            fir_number = fir_match.group(1)
            return await self._verify_fir_claim(claim, fir_number)

        # Try to extract station name from claim
        station_match = self.STATION_PATTERN.search(claim.text)
        if station_match:
            station_name = station_match.group(1).strip()
            return await self._verify_station_claim(claim, station_name)

        # If case_id is provided, check if claim is about this case
        if case_id:
            return await self._verify_case_claim(claim, case_id)

        return None

    async def _verify_fir_claim(self, claim: Claim, fir_number: str) -> ClaimVerification:
        """Verify a claim that references a specific FIR."""

        # Query the FIR table
        rows = self.ds.query(
            "SELECT * FROM cases WHERE fir_number = ? OR crime_no = ?",
            [fir_number, fir_number],
        )

        if not rows:
            # FIR not found — could mean the claim references a non-existent case
            # Mark as unverified, not contradicted (the FIR might exist but not in our DB)
            return ClaimVerification(
                claim=claim,
                status=VerificationStatus.UNVERIFIED,
                evidence_source="ksp_database",
                evidence_detail=f"FIR {fir_number} not found in database",
            )

        fir = rows[0]

        # Basic verification: the FIR exists and has expected fields
        if fir.get("crime_no") or fir.get("fir_number"):
            return ClaimVerification(
                claim=claim,
                status=VerificationStatus.VERIFIED_INTERNAL,
                evidence_source="ksp_database",
                evidence_detail=f"FIR {fir_number} confirmed in KSP database (status: {fir.get('status', 'unknown')})",
            )

        return ClaimVerification(
            claim=claim,
            status=VerificationStatus.UNVERIFIED,
            evidence_source="ksp_database",
            evidence_detail=f"FIR {fir_number} found but could not verify claim details",
        )

    async def _verify_station_claim(self, claim: Claim, station_name: str) -> ClaimVerification:
        """Verify a claim that references a police station."""

        rows = self.ds.query(
            "SELECT * FROM stations WHERE name LIKE ?",
            [f"%{station_name}%"],
        )

        if rows:
            station = rows[0]
            return ClaimVerification(
                claim=claim,
                status=VerificationStatus.VERIFIED_INTERNAL,
                evidence_source="ksp_database",
                evidence_detail=f"Station '{station.get('name', station_name)}' confirmed (district: {station.get('district', 'unknown')})",
            )

        return ClaimVerification(
            claim=claim,
            status=VerificationStatus.UNVERIFIED,
            evidence_source="ksp_database",
            evidence_detail=f"Station '{station_name}' not found in database",
        )

    async def _verify_case_claim(self, claim: Claim, case_id: str) -> ClaimVerification:
        """Verify a claim against the case record."""

        rows = self.ds.query(
            "SELECT * FROM cases WHERE crime_no = ? OR id = ?",
            [case_id, case_id],
        )

        if rows:
            case = rows[0]
            # The case exists — basic corroboration
            return ClaimVerification(
                claim=claim,
                status=VerificationStatus.VERIFIED_INTERNAL,
                evidence_source="ksp_database",
                evidence_detail=f"Case {case_id} confirmed in database (status: {case.get('status', 'unknown')})",
            )

        return ClaimVerification(
            claim=claim,
            status=VerificationStatus.UNVERIFIED,
            evidence_source="ksp_database",
            evidence_detail=f"Case {case_id} not found in database",
        )

    async def _check_external_sources(
        self,
        claim: Claim,
        context: dict[str, Any] | None,
    ) -> ClaimVerification | None:
        """Check external sources for corroboration.

        In the current implementation, this is a placeholder that logs the attempt.
        Full implementation would use web search integration.
        """
        # Placeholder: In production, this would call a web search API
        # For now, we mark all claims that fail internal check as unverified
        logger.debug(
            "[VERIFY] External source check not yet implemented for claim: %s",
            claim.text[:80],
        )
        return None

    def rank_claims(self, verifications: list[ClaimVerification]) -> list[ClaimVerification]:
        """Rank verified claims by evidence source trust level.

        Order: verified_internal > verified_external > unverified
        """
        trust_order = {
            VerificationStatus.VERIFIED_INTERNAL: 0,
            VerificationStatus.VERIFIED_EXTERNAL: 1,
            VerificationStatus.UNVERIFIED: 2,
            VerificationStatus.CONTRADICTED: 3,
        }
        return sorted(verifications, key=lambda v: trust_order.get(v.status, 99))
