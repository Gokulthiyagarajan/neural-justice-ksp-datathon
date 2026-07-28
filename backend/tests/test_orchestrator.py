"""Tests for pipeline orchestrator and router."""

import json
import pytest
from unittest.mock import AsyncMock, patch

from backend.pipeline.orchestrator import (
    PipelineMode,
    PipelineRun,
    PipelineStatus,
    run_pipeline,
    _emit_event,
)
from backend.pipeline.nim_client import NimClient, NimError, NimResponse
from backend.pipeline.evidence_verifier import EvidenceVerifier
from backend.pipeline.final_engine import FinalReport
from backend.api.copilot.datastore import SqliteDataStore

import asyncio


# ── Sample data ────────────────────────────────────────────────────────────

SAMPLE_STAGE1_RESPONSE = json.dumps({
    "claims": [
        {"text": "FIR-001 theft confirmed", "confidence": 0.8, "type": "factual", "source_hint": "database"},
    ],
    "entities": [
        {"name": "Koramangala PS", "type": "station", "relevance": "high"},
    ],
    "hypothesis": "Organized theft pattern in Koramangala area.",
})

SAMPLE_STAGE4_RESPONSE = json.dumps({
    "consistency_score": 0.9,
    "cross_references": [],
    "gaps": [],
    "recommendations": ["Check CCTV footage"],
    "is_consistent": True,
})


@pytest.fixture
def mock_client():
    """NIM client with mocked responses."""
    client = AsyncMock(spec=NimClient)

    # Return different responses based on call order
    responses = [
        NimResponse(content=SAMPLE_STAGE1_RESPONSE, model="gpt-oss-120b", stage_name="stage_1", finish_reason="stop", raw={}),
        NimResponse(content=SAMPLE_STAGE4_RESPONSE, model="nemotron-mini-4b", stage_name="stage_4", finish_reason="stop", raw={}),
    ]
    client.chat = AsyncMock(side_effect=responses)
    return client


@pytest.fixture
def verifier():
    """Evidence verifier with in-memory datastore."""
    ds = SqliteDataStore(":memory:")
    ds.execute("CREATE TABLE cases (id INTEGER, crime_no TEXT, fir_number TEXT, status TEXT)")
    ds.execute("CREATE TABLE stations (id INTEGER, name TEXT, district TEXT)")
    return EvidenceVerifier(ds)


# ── PipelineRun tests ──────────────────────────────────────────────────────


class TestPipelineRun:
    def test_creation(self):
        run = PipelineRun(run_id="test-001", query="Show trends")
        assert run.run_id == "test-001"
        assert run.status == PipelineStatus.PENDING

    def test_to_dict(self):
        run = PipelineRun(run_id="test-001", query="Query", mode=PipelineMode.FAST)
        d = run.to_dict()
        assert d["run_id"] == "test-001"
        assert d["mode"] == "fast"
        assert d["status"] == "pending"


# ── Emit event tests ───────────────────────────────────────────────────────


class TestEmitEvent:
    @pytest.mark.asyncio
    async def test_emit_event(self):
        run = PipelineRun(run_id="test")
        await _emit_event(run, "test_event", stage="stage_1", progress=0.5, data={"key": "value"})
        assert not run._event_queue.empty()
        event = await run._event_queue.get()
        assert event["type"] == "test_event"
        assert event["stage"] == "stage_1"
        assert event["progress"] == 0.5
        assert event["data"]["key"] == "value"


# ── Fast mode pipeline tests ───────────────────────────────────────────────


class TestRunPipeline:
    @pytest.mark.asyncio
    async def test_fast_mode(self, mock_client, verifier):
        events = []
        async for event in run_pipeline(
            query="FIR-001 details",
            client=mock_client,
            verifier=verifier,
            mode=PipelineMode.FAST,
            run_id="test-fast",
        ):
            events.append(event)

        # Should have start, stage events, complete, and final state
        event_types = [e["type"] for e in events]
        assert "pipeline_start" in event_types
        assert "pipeline_complete" in event_types

        # Check the final state
        state_events = [e for e in events if e["type"] == "run_state"]
        assert len(state_events) == 1
        state = state_events[0]["data"]
        assert state["status"] == "completed"
        assert state["final_report"] is not None

    @pytest.mark.asyncio
    async def test_fast_mode_with_error(self, verifier):
        client = AsyncMock(spec=NimClient)
        client.chat.side_effect = NimError("stage_1", "gpt-oss", 500, "Server error")

        events = []
        async for event in run_pipeline(
            query="Query",
            client=client,
            verifier=verifier,
            mode=PipelineMode.FAST,
            run_id="test-error",
        ):
            events.append(event)

        state_events = [e for e in events if e["type"] == "run_state"]
        assert len(state_events) == 1
        # Even with error, it should complete (graceful degradation)
        assert state_events[0]["data"]["status"] in ("completed", "failed")

    @pytest.mark.asyncio
    async def test_deep_mode(self, verifier):
        client = AsyncMock(spec=NimClient)

        # Stage 1 response
        stage1_resp = NimResponse(
            content=SAMPLE_STAGE1_RESPONSE, model="gpt-oss-120b",
            stage_name="stage_1", finish_reason="stop", raw={},
        )
        # Stage 2 response
        stage2_resp = NimResponse(
            content=json.dumps({
                "critique": "Reasonable but needs more evidence",
                "revised_claims": [{"text": "Revised claim", "confidence": 0.8, "type": "factual", "revision_type": "strengthened", "reasoning": "More data"}],
                "alternative_hypotheses": ["Alternative 1"],
                "weaknesses": ["Weakness 1"],
            }),
            model="nemotron-ultra", stage_name="stage_2", finish_reason="stop", raw={},
        )
        # Stage 3 response
        stage3_resp = NimResponse(
            content=json.dumps({
                "analysis": "Deep analysis confirms pattern",
                "final_claims": [{"text": "Confirmed organized theft", "confidence": 0.9, "type": "factual", "evidence_chain": ["FIR-001", "FIR-003"]}],
                "evidence_chains": [{"claim_id": "s3_0", "chain": ["FIR-001", "FIR-003"], "strength": "strong"}],
                "patterns_detected": ["Geographic clustering"],
                "confidence_adjustments": [],
            }),
            model="deepseek-r1", stage_name="stage_3", finish_reason="stop", raw={},
        )
        # Stage 4 response
        stage4_resp = NimResponse(
            content=SAMPLE_STAGE4_RESPONSE, model="nemotron-mini-4b",
            stage_name="stage_4", finish_reason="stop", raw={},
        )

        client.chat = AsyncMock(side_effect=[stage1_resp, stage2_resp, stage3_resp, stage4_resp])

        events = []
        async for event in run_pipeline(
            query="Deep analysis",
            client=client,
            verifier=verifier,
            mode=PipelineMode.DEEP,
            run_id="test-deep",
        ):
            events.append(event)

        state_events = [e for e in events if e["type"] == "run_state"]
        assert len(state_events) == 1
        assert state_events[0]["data"]["status"] == "completed"
        assert state_events[0]["data"]["final_report"] is not None
        # Deep mode should have 5 stages completed (1,2,3,4,final)
        assert len(state_events[0]["data"]["stages_completed"]) == 5

    @pytest.mark.asyncio
    async def test_run_id_auto_generated(self, mock_client, verifier):
        events = []
        async for event in run_pipeline(
            query="Query",
            client=mock_client,
            verifier=verifier,
            mode=PipelineMode.FAST,
        ):
            events.append(event)

        state_events = [e for e in events if e["type"] == "run_state"]
        assert len(state_events) == 1
        assert state_events[0]["data"]["run_id"]  # Should have an auto-generated ID
