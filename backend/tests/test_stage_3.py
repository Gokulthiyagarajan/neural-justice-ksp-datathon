"""Tests for stage_3_deep_reasoning module."""

import json
import pytest
from unittest.mock import AsyncMock

from backend.pipeline.stage_3_deep_reasoning import (
    run_stage_3,
    Stage3Output,
    _parse_response,
    _build_user_message,
)
from backend.pipeline.nim_client import NimClient, NimError, NimResponse
from backend.pipeline.evidence_verifier import EvidenceVerifier
from backend.api.copilot.datastore import SqliteDataStore


SAMPLE_STAGE1 = {
    "hypothesis": "Theft pattern in Koramangala",
    "claims": [
        {"text": "FIR-001 theft confirmed", "confidence": 0.8, "type": "factual"},
    ],
    "entities": [
        {"name": "Koramangala PS", "type": "station", "relevance": "high"},
    ],
}

SAMPLE_STAGE2 = {
    "critique": "Needs more evidence",
    "revised_claims": [
        {"text": "FIR-001 theft with witness", "confidence": 0.85, "type": "factual", "revision_type": "strengthened"},
    ],
    "weaknesses": ["Only one FIR analyzed"],
    "alternative_hypotheses": ["Could be inside job"],
}

SAMPLE_RESPONSE = json.dumps({
    "analysis": "Deep analysis reveals organized theft pattern with 3 connected incidents.",
    "final_claims": [
        {
            "text": "Organized theft ring operating in Koramangala since Jan 2026",
            "confidence": 0.92,
            "type": "factual",
            "evidence_chain": ["FIR-001 theft", "Similar MO in FIR-003", "Geographic clustering"],
            "reasoning_depth": "deep",
        },
    ],
    "evidence_chains": [
        {
            "claim_id": "s3_0",
            "chain": ["FIR-001 details", "FIR-003 similar MO", "Both within 2km radius", "Organized pattern confirmed"],
            "strength": "strong",
        },
    ],
    "patterns_detected": [
        "Geographic clustering of thefts within 2km radius",
        "Temporal pattern: all incidents on weekends",
    ],
    "confidence_adjustments": [
        {
            "claim_text": "Theft pattern in Koramangala",
            "old_confidence": 0.6,
            "new_confidence": 0.92,
            "reason": "Multiple evidence sources confirm pattern",
        },
    ],
})


class TestParseResponse:
    def test_valid_json(self):
        output = _parse_response(SAMPLE_RESPONSE)
        assert output.analysis.startswith("Deep analysis")
        assert len(output.final_claims) == 1
        assert len(output.evidence_chains) == 1
        assert len(output.patterns_detected) == 2
        assert len(output.confidence_adjustments) == 1

    def test_no_json(self):
        output = _parse_response("Just text")
        assert output.analysis == "Just text"
        assert len(output.final_claims) == 0

    def test_malformed_json(self):
        output = _parse_response("{bad}")
        assert len(output.final_claims) == 0

    def test_missing_fields(self):
        data = json.dumps({"final_claims": [{"text": "claim"}]})
        output = _parse_response(data)
        assert output.final_claims[0]["confidence"] == 0.5


class TestBuildUserMessage:
    def test_stage1_only(self):
        msg = _build_user_message(SAMPLE_STAGE1, None)
        assert "Stage 1" in msg
        assert "Stage 2" not in msg
        assert "Theft pattern" in msg

    def test_both_stages(self):
        msg = _build_user_message(SAMPLE_STAGE1, SAMPLE_STAGE2)
        assert "Stage 1" in msg
        assert "Stage 2" in msg
        assert "Needs more evidence" in msg
        assert "Weaknesses" in msg
        assert "Alternative Hypotheses" in msg

    def test_empty_stages(self):
        msg = _build_user_message({}, None)
        assert "DEEP CHAIN-OF-THOUGHT" in msg


class TestRunStage3:
    @pytest.mark.asyncio
    async def test_successful(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="deepseek-r1",
            stage_name="stage_3",
            finish_reason="stop",
            raw={},
        )
        output = await run_stage_3(SAMPLE_STAGE1, client)
        assert output.analysis.startswith("Deep analysis")
        assert len(output.final_claims) == 1
        assert len(output.evidence_chains) == 1
        assert len(output.patterns_detected) == 2

    @pytest.mark.asyncio
    async def test_with_stage2(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="deepseek-r1",
            stage_name="stage_3",
            finish_reason="stop",
            raw={},
        )
        output = await run_stage_3(SAMPLE_STAGE1, client, stage2_output=SAMPLE_STAGE2)
        assert len(output.final_claims) == 1
        client.chat.assert_called_once()

    @pytest.mark.asyncio
    async def test_nim_error(self):
        client = AsyncMock(spec=NimClient)
        client.chat.side_effect = NimError("stage_3", "deepseek", 500, "Server error")
        output = await run_stage_3(SAMPLE_STAGE1, client)
        assert "failed" in output.analysis.lower()

    @pytest.mark.asyncio
    async def test_with_evidence_verifier(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="deepseek-r1",
            stage_name="stage_3",
            finish_reason="stop",
            raw={},
        )
        ds = SqliteDataStore(":memory:")
        ds.execute("CREATE TABLE cases (id INTEGER, crime_no TEXT, fir_number TEXT)")
        verifier = EvidenceVerifier(ds)

        output = await run_stage_3(SAMPLE_STAGE1, client, evidence_verifier=verifier)
        assert output.verification is not None
        assert output.verification.total_claims == 1

    @pytest.mark.asyncio
    async def test_with_context(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_RESPONSE,
            model="deepseek-r1",
            stage_name="stage_3",
            finish_reason="stop",
            raw={},
        )
        output = await run_stage_3(
            SAMPLE_STAGE1, client, case_id="KSP-001", context={"district": "Bengaluru"}
        )
        assert len(output.final_claims) == 1
