"""Tests for stage_1_generation module."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.pipeline.stage_1_generation import (
    run_stage_1,
    Stage1Output,
    _parse_response,
    _build_user_message,
)
from backend.pipeline.nim_client import NimClient, NimError, NimResponse
from backend.pipeline.evidence_verifier import Claim, ClaimVerification, EvidenceVerifier, VerificationResult, VerificationStatus
from backend.api.copilot.datastore import SqliteDataStore


# ── Sample valid response ──────────────────────────────────────────────────

SAMPLE_RESPONSE = json.dumps({
    "claims": [
        {"text": "FIR-001 involves theft at Koramangala", "confidence": 0.8, "type": "factual", "source_hint": "database"},
        {"text": "Similar pattern in 3 other cases", "confidence": 0.6, "type": "inferential", "source_hint": "pattern"},
    ],
    "entities": [
        {"name": "Koramangala PS", "type": "station", "relevance": "high"},
        {"name": "Theft", "type": "crime", "relevance": "high"},
    ],
    "hypothesis": "Theft pattern suggests organized group operating in Koramangala area."
})


class TestParseResponse:
    def test_valid_json(self):
        output = _parse_response(SAMPLE_RESPONSE)
        assert len(output.claims) == 2
        assert len(output.entities) == 2
        assert "Theft pattern" in output.hypothesis
        assert output.claims[0]["confidence"] == 0.8

    def test_no_json_found(self):
        output = _parse_response("Just plain text with no JSON")
        assert len(output.claims) == 0
        assert output.hypothesis == "Just plain text with no JSON"

    def test_malformed_json(self):
        output = _parse_response("{invalid json here}")
        assert len(output.claims) == 0

    def test_missing_fields(self):
        data = json.dumps({"claims": [{"text": "claim without confidence"}]})
        output = _parse_response(data)
        assert len(output.claims) == 1
        assert output.claims[0]["confidence"] == 0.5  # default

    def test_missing_text_field(self):
        data = json.dumps({"claims": [{"confidence": 0.7}]})
        output = _parse_response(data)
        assert len(output.claims) == 1
        assert "text" in output.claims[0]


class TestBuildUserMessage:
    def test_query_only(self):
        msg = _build_user_message("Show crime trends", None, None)
        assert "Show crime trends" in msg
        assert "Case ID" not in msg

    def test_with_case_id(self):
        msg = _build_user_message("Query", "KSP-001", None)
        assert "Case ID: KSP-001" in msg

    def test_with_context(self):
        msg = _build_user_message("Query", None, {"district": "Bengaluru", "station": "Koramangala"})
        assert "District: Bengaluru" in msg
        assert "Station: Koramangala" in msg


class TestStage1Output:
    def test_verified_claims_without_verification(self):
        out = Stage1Output(claims=[{"text": "claim1"}, {"text": "claim2"}])
        verified = out.verified_claims
        assert len(verified) == 2
        assert verified[0].text == "claim1"

    def test_verified_claims_with_verification(self):
        v = VerificationResult(
            verified_claims=[
                ClaimVerification(claim=Claim(id="c1", text="v1"), status=VerificationStatus.VERIFIED_INTERNAL),
            ],
            total_claims=2,
            contradicted_count=1,
        )
        out = Stage1Output(claims=[{"text": "v1"}, {"text": "dropped"}], verification=v)
        assert len(out.verified_claims) == 1
        assert out.pass_rate == 0.5


class TestRunStage1:
    @pytest.mark.asyncio
    async def test_successful_generation(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="gpt-oss-120b",
            stage_name="stage_1",
            finish_reason="stop",
            raw={},
        )

        output = await run_stage_1("Show crime trends", client)
        assert len(output.claims) == 2
        assert "Theft pattern" in output.hypothesis
        client.chat.assert_called_once()

    @pytest.mark.asyncio
    async def test_nim_error_returns_graceful(self):
        client = AsyncMock(spec=NimClient)
        client.chat.side_effect = NimError("stage_1", "429", 429, "Rate limited")

        output = await run_stage_1("Query", client)
        assert len(output.claims) == 0
        assert "Rate limited" in output.hypothesis

    @pytest.mark.asyncio
    async def test_with_evidence_verifier(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="gpt-oss-120b",
            stage_name="stage_1",
            finish_reason="stop",
            raw={},
        )

        ds = SqliteDataStore(":memory:")
        ds.execute("CREATE TABLE cases (id INTEGER, crime_no TEXT, fir_number TEXT)")
        ds.execute("INSERT INTO cases (crime_no, fir_number) VALUES ('KSP-001', 'FIR-001')")
        verifier = EvidenceVerifier(ds)

        output = await run_stage_1("FIR-001 details", client, evidence_verifier=verifier)
        assert output.verification is not None
        assert output.verification.total_claims == 2

    @pytest.mark.asyncio
    async def test_with_case_id_and_context(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="gpt-oss-120b",
            stage_name="stage_1",
            finish_reason="stop",
            raw={},
        )

        output = await run_stage_1(
            "Query",
            client,
            case_id="KSP-001",
            context={"district": "Bengaluru"},
        )
        assert len(output.claims) == 2

    @pytest.mark.asyncio
    async def test_unexpected_error_returns_graceful(self):
        client = AsyncMock(spec=NimClient)
        client.chat.side_effect = RuntimeError("Network down")

        output = await run_stage_1("Query", client)
        assert len(output.claims) == 0
        assert "Network down" in output.hypothesis
