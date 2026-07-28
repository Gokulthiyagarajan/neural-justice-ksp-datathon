"""Tests for stage_4_consistency and final_engine modules."""

import json
import pytest
from unittest.mock import AsyncMock

from backend.pipeline.stage_4_consistency import (
    run_stage_4,
    Stage4Output,
    _parse_response,
    _build_user_message,
)
from backend.pipeline.final_engine import (
    build_final_report,
    FinalReport,
)
from backend.pipeline.nim_client import NimClient, NimError, NimResponse
from backend.pipeline.evidence_verifier import (
    Claim,
    ClaimVerification,
    VerificationResult,
    VerificationStatus,
)


# ── Sample data ────────────────────────────────────────────────────────────

SAMPLE_STAGE4_RESPONSE = json.dumps({
    "consistency_score": 0.85,
    "cross_references": [
        {"claim_ids": ["s1_0", "s1_1"], "relationship": "supports", "detail": "Claims align on theft pattern"}
    ],
    "gaps": ["No witness statements verified"],
    "recommendations": ["Check CCTV footage near Koramangala"],
    "is_consistent": True,
})

SAMPLE_STAGE1 = {
    "hypothesis": "Theft pattern in Koramangala area",
    "claims": [
        {"text": "FIR-001 involves theft", "confidence": 0.8, "type": "factual", "source_hint": "database"},
        {"text": "Similar pattern in other cases", "confidence": 0.6, "type": "inferential", "source_hint": "pattern"},
    ],
    "entities": [
        {"name": "Koramangala PS", "type": "station", "relevance": "high"},
    ],
}

SAMPLE_STAGE2 = {
    "critique": "Initial hypothesis is plausible but needs more evidence",
    "revised_claims": [
        {"text": "FIR-001 confirmed theft", "confidence": 0.85, "type": "factual"},
    ],
}

SAMPLE_STAGE3 = {
    "analysis": "Deep analysis confirms organized theft ring",
    "final_claims": [
        {"text": "Organized theft confirmed", "confidence": 0.9, "type": "factual"},
    ],
}


# ── Stage 4 tests ──────────────────────────────────────────────────────────


class TestParseResponse:
    def test_valid_json(self):
        output = _parse_response(SAMPLE_STAGE4_RESPONSE)
        assert output.consistency_score == 0.85
        assert len(output.cross_references) == 1
        assert len(output.gaps) == 1
        assert output.is_consistent is True

    def test_no_json(self):
        output = _parse_response("No JSON here")
        assert output.consistency_score == 0.0
        assert len(output.gaps) > 0

    def test_malformed_json(self):
        output = _parse_response("{bad json}")
        assert len(output.gaps) > 0


class TestBuildUserMessage:
    def test_stage1_only(self):
        msg = _build_user_message(SAMPLE_STAGE1, None, None)
        assert "Stage 1" in msg
        assert "Stage 2" not in msg

    def test_all_stages(self):
        msg = _build_user_message(SAMPLE_STAGE1, SAMPLE_STAGE2, SAMPLE_STAGE3)
        assert "Stage 1" in msg
        assert "Stage 2" in msg
        assert "Stage 3" in msg


class TestRunStage4:
    @pytest.mark.asyncio
    async def test_successful(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_STAGE4_RESPONSE,
            model="nemotron-mini-4b",
            stage_name="stage_4",
            finish_reason="stop",
            raw={},
        )
        output = await run_stage_4(SAMPLE_STAGE1, client)
        assert output.consistency_score == 0.85
        assert output.is_consistent is True

    @pytest.mark.asyncio
    async def test_nim_error(self):
        client = AsyncMock(spec=NimClient)
        client.chat.side_effect = NimError("stage_4", "nemotron", 500, "Server error")
        output = await run_stage_4(SAMPLE_STAGE1, client)
        assert output.is_consistent is True  # Don't block on errors
        assert len(output.gaps) > 0

    @pytest.mark.asyncio
    async def test_with_deep_stages(self):
        client = AsyncMock(spec=NimClient)
        client.chat.return_value = NimResponse(
            content=SAMPLE_STAGE4_RESPONSE,
            model="nemotron-mini-4b",
            stage_name="stage_4",
            finish_reason="stop",
            raw={},
        )
        output = await run_stage_4(SAMPLE_STAGE1, client, SAMPLE_STAGE2, SAMPLE_STAGE3)
        assert output.consistency_score == 0.85


# ── Final Engine tests ─────────────────────────────────────────────────────


class TestFinalReport:
    def test_to_dict(self):
        report = FinalReport(report_id="RPT-001", query="test query")
        d = report.to_dict()
        assert d["report_id"] == "RPT-001"
        assert d["query"] == "test query"

    def test_empty_report(self):
        report = FinalReport()
        d = report.to_dict()
        assert d["claims"]["total_generated"] == 0


class TestBuildFinalReport:
    def test_fast_mode(self):
        report = build_final_report(
            query="Show crime trends",
            mode="fast",
            stage1_output=SAMPLE_STAGE1,
            stage4_output=json.loads(SAMPLE_STAGE4_RESPONSE),
            processing_time_ms=1500.0,
        )
        assert report.mode == "fast"
        assert "stage_1_generation" in report.stages_completed
        assert "stage_4_consistency" in report.stages_completed
        assert "final_assembly" in report.stages_completed
        assert len(report.stages_completed) == 3  # stage1 + stage4 + final

    def test_deep_mode(self):
        report = build_final_report(
            query="Deep analysis",
            mode="deep",
            stage1_output=SAMPLE_STAGE1,
            stage2_output=SAMPLE_STAGE2,
            stage3_output=SAMPLE_STAGE3,
            stage4_output=json.loads(SAMPLE_STAGE4_RESPONSE),
        )
        assert report.mode == "deep"
        assert len(report.stages_completed) == 5  # all 4 + final

    def test_claims_categorized_with_verification(self):
        verification = VerificationResult(
            verified_claims=[
                ClaimVerification(
                    claim=Claim(id="stage_1_0", text="FIR-001"),
                    status=VerificationStatus.VERIFIED_INTERNAL,
                    evidence_source="ksp_database",
                    evidence_detail="Found in DB",
                ),
            ],
            unverified_count=1,
            total_claims=2,
        )
        report = build_final_report(
            query="Query",
            mode="fast",
            stage1_output=SAMPLE_STAGE1,
            verification=verification,
        )
        assert len(report.verified_claims) == 1
        assert report.total_claims_verified == 1

    def test_claims_without_verification(self):
        report = build_final_report(
            query="Query",
            mode="fast",
            stage1_output=SAMPLE_STAGE1,
        )
        assert len(report.unverified_claims) == 2
        assert report.total_claims_verified == 0

    def test_hypothesis_from_advanced_stage(self):
        report = build_final_report(
            query="Query",
            mode="deep",
            stage1_output=SAMPLE_STAGE1,
            stage3_output=SAMPLE_STAGE3,
        )
        assert "organized theft" in report.hypothesis.lower()

    def test_entities_from_stage1(self):
        report = build_final_report(
            query="Query",
            mode="fast",
            stage1_output=SAMPLE_STAGE1,
        )
        assert len(report.entities) == 1
        assert report.entities[0]["name"] == "Koramangala PS"

    def test_default_recommendations(self):
        report = build_final_report(
            query="Query",
            mode="fast",
            stage1_output=SAMPLE_STAGE1,
        )
        assert len(report.recommendations) > 0

    def test_executive_summary_generated(self):
        report = build_final_report(
            query="Show trends",
            mode="fast",
            stage1_output=SAMPLE_STAGE1,
        )
        assert "Show trends" in report.executive_summary
        assert "fast" in report.executive_summary

    def test_no_stages_minimal_report(self):
        report = build_final_report(query="Empty query", mode="fast")
        assert report.hypothesis == "Insufficient data to form hypothesis."
        assert len(report.verified_claims) == 0

    def test_report_id_auto_generated(self):
        report = build_final_report(query="Query", mode="fast")
        assert report.report_id.startswith("RPT-")

    def test_report_id_custom(self):
        report = build_final_report(query="Query", mode="fast", report_id="CUSTOM-001")
        assert report.report_id == "CUSTOM-001"
