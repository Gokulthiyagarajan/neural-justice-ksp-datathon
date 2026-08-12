"""Pipeline API Router — FastAPI routes for the investigation pipeline.

Provides:
- POST /api/v1/investigate — Start a pipeline run, returns run_id
- GET /api/v1/investigate/stream/{run_id} — SSE stream of progress events
- GET /api/v1/investigate/{run_id} — Get run status
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.pipeline.nim_client import NimClient
from backend.pipeline.evidence_verifier import EvidenceVerifier
from backend.pipeline.orchestrator import (
    PipelineMode,
    PipelineRun,
    PipelineStatus,
    run_pipeline,
)
from backend.api.copilot.datastore import DataStore, get_datastore
from backend.api.copilot.auth import CurrentUser, get_current_user

logger = logging.getLogger("nj.pipeline.router")

router = APIRouter()


# ── Request/Response models ────────────────────────────────────────────────


class InvestigateRequest(BaseModel):
    """Request to start an investigation pipeline run."""

    query: str = Field(..., min_length=3, max_length=2000, description="Officer's query")
    mode: str = Field("fast", pattern="^(fast|deep)$", description="Pipeline mode")
    case_id: str | None = Field(None, description="Optional case ID for context")
    context: dict[str, Any] = Field(default_factory=dict, description="Additional context")


class InvestigateResponse(BaseModel):
    """Response when starting a pipeline run."""

    run_id: str
    status: str
    message: str


class RunStatusResponse(BaseModel):
    """Response for run status query."""

    run_id: str
    status: str
    current_stage: str
    stages_completed: list[str]
    processing_time_ms: float
    error: str | None


# ── In-memory run store (production would use Redis/DB) ────────────────────

_run_store: dict[str, PipelineRun] = {}

# Shared NIM client and verifier (initialized lazily)
_nim_client: NimClient | None = None
_verifier: EvidenceVerifier | None = None


def _get_nim_client() -> NimClient:
    global _nim_client
    if _nim_client is None:
        _nim_client = NimClient()
    return _nim_client


def _get_verifier(ds: DataStore) -> EvidenceVerifier:
    global _verifier
    if _verifier is None:
        _verifier = EvidenceVerifier(ds)
    return _verifier


# ── Routes ─────────────────────────────────────────────────────────────────


@router.post("/investigate", response_model=InvestigateResponse)
async def start_investigation(
    request: InvestigateRequest,
    user: CurrentUser = Depends(get_current_user),
    ds: DataStore = Depends(get_datastore),
) -> InvestigateResponse:
    """Start an investigation pipeline run.

    Returns a run_id that can be used to stream progress via SSE.
    """
    import uuid

    run_id = str(uuid.uuid4())[:12]
    logger.info("[PIPELINE] Starting run %s: %s", run_id, request.query[:80])

    # Start the pipeline in background
    client = _get_nim_client()
    verifier = _get_verifier(ds)

    async def _run_and_collect():
        """Run pipeline and collect events into the run object."""
        run = PipelineRun(
            run_id=run_id,
            query=request.query,
            mode=PipelineMode(request.mode),
            case_id=request.case_id,
            context=request.context,
        )
        _run_store[run_id] = run

        try:
            async for event in run_pipeline(
                query=request.query,
                client=client,
                verifier=verifier,
                mode=PipelineMode(request.mode),
                case_id=request.case_id,
                context=request.context,
                run_id=run_id,
            ):
                # Store the final report if present
                if event.get("type") == "run_state":
                    run_data = event.get("data", {})
                    run.status = PipelineStatus(run_data.get("status", "completed"))
                    run.final_report = run_data.get("final_report")
                    run.processing_time_ms = run_data.get("processing_time_ms", 0)
                    run.error = run_data.get("error")
        except Exception as e:
            run.status = PipelineStatus.FAILED
            run.error = str(e)
            logger.error("[PIPELINE] Background run failed: %s", str(e))

    # Fire and forget — the run happens in background
    asyncio.create_task(_run_and_collect())

    return InvestigateResponse(
        run_id=run_id,
        status="pending",
        message=f"Pipeline run started. Stream progress at /api/v1/investigate/stream/{run_id}",
    )


@router.get("/investigate/stream/{run_id}")
async def stream_investigation(run_id: str):
    """Stream pipeline progress via Server-Sent Events (SSE).

    Connect to this endpoint to receive real-time progress updates.
    """
    if run_id not in _run_store:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    run = _run_store[run_id]

    async def event_generator():
        """Generate SSE events from the pipeline run."""
        # Wait for pipeline to complete (poll with timeout)
        max_wait = 120  # seconds
        waited = 0

        while run.status == PipelineStatus.PENDING and waited < max_wait:
            await asyncio.sleep(0.1)
            waited += 0.1

        if run.status == PipelineStatus.PENDING:
            yield _sse_event({"type": "error", "data": {"error": "Run timed out"}})
            return

        # If already completed, yield the final report
        if run.status in (PipelineStatus.COMPLETED, PipelineStatus.FAILED):
            if run.final_report:
                yield _sse_event({
                    "type": "pipeline_complete",
                    "progress": 1.0,
                    "data": run.final_report,
                })
            elif run.error:
                yield _sse_event({
                    "type": "pipeline_error",
                    "data": {"error": run.error},
                })
            yield _sse_event({"type": "run_state", "data": run.to_dict()})
            return

        # Stream events as they happen (poll the event queue)
        while run.status == PipelineStatus.RUNNING:
            if not run._event_queue.empty():
                event = await run._event_queue.get()
                yield _sse_event(event)
            else:
                await asyncio.sleep(0.05)

        # Drain remaining events
        while not run._event_queue.empty():
            event = await run._event_queue.get()
            yield _sse_event(event)

        # Final state
        yield _sse_event({"type": "run_state", "data": run.to_dict()})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/investigate/{run_id}", response_model=RunStatusResponse)
async def get_run_status(run_id: str) -> RunStatusResponse:
    """Get the status of a pipeline run."""
    if run_id not in _run_store:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    run = _run_store[run_id]
    return RunStatusResponse(
        run_id=run.run_id,
        status=run.status.value,
        current_stage=run.current_stage,
        stages_completed=run.stages_completed,
        processing_time_ms=run.processing_time_ms,
        error=run.error,
    )


# ── Helpers ────────────────────────────────────────────────────────────────


def _sse_event(event: dict[str, Any]) -> str:
    """Format a dict as an SSE event string."""
    return f"data: {json.dumps(event)}\n\n"
