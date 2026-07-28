"""Tests for stage_2_critical_review module."""

import json
import pytest
from unittest.mock import AsyncMock

from backend.pipeline.stage_2_critical_review import (
    run_stage_2,
    Stage2Output,
    _parse_response,
    _build_user_message,
)
from backend.pipeline.nim_client import NimClient, NimError, NimResponse
from backend.pipeline.evidence_verifier import EvidenceVerifier
from backend.api.copilot.datastore import SqliteDataStore


SAMPLE_STAGE1 = {
    "hypothesis": "Theft pattern in Koramangala",
    "claims": [
        {"text": "FIR-001 theft confirmed", "confidence": 0.8, "type": "factual", "source_hint": "database"},
    ],
    "entities": [
        {"name": "Koramangala PS", "type": "station", "relevance": "high"},
    ],
}

SAMPLE_RESPONSE = json.dumps({
    "critique": "The initial draft is reasonable but relies heavily on a single FIR without cross-referencing.",
    "revised_claims": [
        {
            "text": "FIR-001 theft confirmed with additional witness evidence",
            "confidence": 0.85,
            "type": "factual",
            "revision_type": "strengthened",
            "reasoning": "Additional witness statement corroborates the FIR details",
        },
    ],
    "alternative_hypotheses": [
        "The theft could be an inside job rather than external perpetrators",
    ],
    "weaknesses": [
        "Only one FIR analyzed — pattern claim is premature",
    ],
})


class TestParseResponse:
    def test_valid_json(self):
        output = _parse_response(SAMPLE_RESPONSE)
        assert output.critique.startswith("The initial draft")
        assert len(output.revised_claims) == 1
        assert len(output.alternative_hypotheses) == 1
        assert len(output.weaknesses) == 1

    def test_no_json(self):
        output = _parse_response("Just text")
        assert output.critique == "Just text"
        assert len(output.revised_claims) == 0

    def test_malformed_json(self):
        output = _parse_response("{bad}")
        assert len(output.revised_claims) == 0

    def test_missing_fields(self):
        data = json.dumps({"revised_claims": [{"text": "claim"}]})
        output = _parse_response(data)
        assert output.revised_claims[0]["confidence"] == 0.5


class TestBuildUserMessage:
    def test_includes_stage1_data(self):
        msg = _build_user_message(SAMPLE_STAGE1)
        assert "Theft pattern in Koramangala" in msg
        assert "FIR-001 theft confirmed" in msg
        assert "Koramangala PS" in msg

    def test_empty_stage1(self):
        msg = _build_user_message({})
        assert "CRITICALLY REVIEW" in msg


class TestRunStage2:
    @pytest.mark.asyncio
    async def test_successful(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="nemotron-ultra",
            stage_name="stage_2",
            finish_reason="stop",
            raw={},
        )
        output = await run_stage_2(SAMPLE_STAGE1, client)
        assert output.critique.startswith("The initial draft")
        assert len(output.revised_claims) == 1
        assert len(output.alternative_hypotheses) == 1

    @pytest.mark.asyncio
    async def test_nim_error(self):
        client = AsyncMock(spec=NimClient)
        client.chat.side_effect = NimError("stage_2", "nemotron", 500, "Server error")
        output = await run_stage_2(SAMPLE_STAGE1, client)
        assert "failed" in output.critique.lower()

    @pytest.mark.asyncio
    async def test_with_evidence_verifier(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="nemotron-ultra",
            stage_name="stage_2",
            finish_reason="stop",
            raw={},
        )
        ds = SqliteDataStore(":memory:")
        ds.execute("CREATE TABLE cases (id INTEGER, crime_no TEXT, fir_number TEXT)")
        verifier = EvidenceVerifier(ds)

        output = await run_stage_2(SAMPLE_STAGE1, client, evidence_verifier=verifier)
        assert output.verification is not None
        assert output.verification.total_claims == 1

    @pytest.mark.asyncio
    async def test_with_context(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="nemotron-ultra",
            stage_name="stage_2",
            finish_reason="stop",
            raw={},
        )
        output = await run_stage_2(
            SAMPLE_STAGE1, client, case_id="KSP-001", context={"district": "Bengaluru"}
        )
        assert len(output.revised_claims) == 1
