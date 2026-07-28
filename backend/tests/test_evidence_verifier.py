"""Tests for evidence_verifier module."""

import pytest
from unittest.mock import MagicMock
from backend.pipeline.evidence_verifier import (
    EvidenceVerifier,
    Claim,
    ClaimVerification,
    VerificationResult,
    VerificationStatus,
)
from backend.api.copilot.datastore import SqliteDataStore


@pytest.fixture
def ds():
    """In-memory DataStore with sample tables."""
    store = SqliteDataStore(":memory:")
    store.execute("""
        CREATE TABLE cases (
            id INTEGER PRIMARY KEY,
            crime_no TEXT,
            fir_number TEXT,
            status TEXT,
            type_of_offence TEXT,
            date_of_occurrence TEXT,
            police_station TEXT,
            district TEXT
        )
    """)
    store.execute("""
        CREATE TABLE stations (
            id INTEGER PRIMARY KEY,
            name TEXT,
            district TEXT,
            circle TEXT
        )
    """)
    # Seed sample data
    store.execute(
        "INSERT INTO cases (crime_no, fir_number, status, type_of_offence, district) "
        "VALUES (?, ?, ?, ?, ?)",
        ["KSP-2026-001", "FIR-001", "under_investigation", "theft", "Bengaluru Urban"],
    )
    store.execute(
        "INSERT INTO stations (name, district, circle) VALUES (?, ?, ?)",
        ["Koramangala PS", "Bengaluru Urban", "South"],
    )
    return store


@pytest.fixture
def verifier(ds):
    return EvidenceVerifier(ds)


class TestClaim:
    def test_claim_creation(self):
        c = Claim(id="c1", text="Theft at Koramangala PS", source_hint="test")
        assert c.id == "c1"
        assert c.text == "Theft at Koramangala PS"
        assert c.stage == 0

    def test_claim_hashable(self):
        c1 = Claim(id="c1", text="a")
        c2 = Claim(id="c1", text="b")
        assert c1 == c2
        assert len({c1, c2}) == 1


class TestClaimVerification:
    def test_verified_internal(self):
        c = Claim(id="c1", text="test")
        v = ClaimVerification(claim=c, status=VerificationStatus.VERIFIED_INTERNAL)
        assert v.is_verified is True
        assert v.is_dropped is False

    def test_unverified(self):
        c = Claim(id="c1", text="test")
        v = ClaimVerification(claim=c, status=VerificationStatus.UNVERIFIED)
        assert v.is_verified is False
        assert v.is_dropped is False

    def test_contradicted(self):
        c = Claim(id="c1", text="test")
        v = ClaimVerification(claim=c, status=VerificationStatus.CONTRADICTED)
        assert v.is_verified is False
        assert v.is_dropped is True


class TestVerificationResult:
    def test_pass_rate_empty(self):
        r = VerificationResult()
        assert r.pass_rate == 1.0

    def test_pass_rate_all_verified(self):
        r = VerificationResult(
            total_claims=5,
            verified_count=3,
            external_count=2,
            unverified_count=0,
            contradicted_count=0,
        )
        assert r.pass_rate == 1.0

    def test_pass_rate_some_contradicted(self):
        r = VerificationResult(
            total_claims=10,
            verified_count=5,
            external_count=2,
            unverified_count=1,
            contradicted_count=2,
        )
        assert r.pass_rate == 0.8


class TestVerifyInternalDatabase:
    @pytest.mark.asyncio
    async def test_fir_claim_verified(self, verifier):
        claims = [Claim(id="c1", text="FIR-001 is under investigation in Bengaluru Urban")]
        result = await verifier.verify_claims(claims)
        assert len(result.verified_claims) == 1
        assert result.verified_claims[0].status == VerificationStatus.VERIFIED_INTERNAL
        assert result.contradicted_count == 0

    @pytest.mark.asyncio
    async def test_fir_claim_not_found(self, verifier):
        claims = [Claim(id="c1", text="FIR-999999 needs immediate attention")]
        result = await verifier.verify_claims(claims)
        assert len(result.verified_claims) == 1
        assert result.verified_claims[0].status == VerificationStatus.UNVERIFIED

    @pytest.mark.asyncio
    async def test_station_claim_verified(self, verifier):
        claims = [Claim(id="c1", text="Police station Koramangala has 15 pending cases")]
        result = await verifier.verify_claims(claims)
        assert len(result.verified_claims) == 1
        assert result.verified_claims[0].status == VerificationStatus.VERIFIED_INTERNAL

    @pytest.mark.asyncio
    async def test_station_claim_not_found(self, verifier):
        claims = [Claim(id="c1", text="Police station NonExistent has no officers")]
        result = await verifier.verify_claims(claims)
        assert len(result.verified_claims) == 1
        assert result.verified_claims[0].status == VerificationStatus.UNVERIFIED

    @pytest.mark.asyncio
    async def test_case_claim_verified(self, verifier):
        claims = [Claim(id="c1", text="General statement about case KSP-2026-001")]
        result = await verifier.verify_claims(claims, case_id="KSP-2026-001")
        assert len(result.verified_claims) == 1
        assert result.verified_claims[0].status == VerificationStatus.VERIFIED_INTERNAL

    @pytest.mark.asyncio
    async def test_unrelated_claim_unverified(self, verifier):
        claims = [Claim(id="c1", text="The weather will be sunny tomorrow")]
        result = await verifier.verify_claims(claims)
        assert len(result.verified_claims) == 1
        assert result.verified_claims[0].status == VerificationStatus.UNVERIFIED


class TestBatchVerification:
    @pytest.mark.asyncio
    async def test_mixed_claims(self, verifier):
        claims = [
            Claim(id="c1", text="FIR-001 is critical"),          # verified
            Claim(id="c2", text="Station Koramangala is active"), # verified
            Claim(id="c3", text="Random unrelated claim"),        # unverified
        ]
        result = await verifier.verify_claims(claims)
        assert result.total_claims == 3
        assert result.verified_count == 2
        assert result.unverified_count == 1
        assert result.contradicted_count == 0
        assert result.pass_rate == 1.0

    @pytest.mark.asyncio
    async def test_empty_claims(self, verifier):
        result = await verifier.verify_claims([])
        assert result.total_claims == 0
        assert result.pass_rate == 1.0


class TestRanking:
    def test_rank_claims_order(self, verifier):
        unverified = ClaimVerification(
            claim=Claim(id="u1", text="u"), status=VerificationStatus.UNVERIFIED
        )
        external = ClaimVerification(
            claim=Claim(id="e1", text="e"), status=VerificationStatus.VERIFIED_EXTERNAL
        )
        internal = ClaimVerification(
            claim=Claim(id="i1", text="i"), status=VerificationStatus.VERIFIED_INTERNAL
        )
        ranked = verifier.rank_claims([unverified, external, internal])
        assert ranked[0].status == VerificationStatus.VERIFIED_INTERNAL
        assert ranked[1].status == VerificationStatus.VERIFIED_EXTERNAL
        assert ranked[2].status == VerificationStatus.UNVERIFIED
