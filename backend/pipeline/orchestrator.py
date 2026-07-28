"""Pipeline Orchestrator — Coordinates all stages.

Runs the full pipeline: Stage 1 → verify → Stage 4 → final (fast mode).
Or all stages with verify after each (deep mode).

Handles SSE event emission for real-time progress tracking.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, AsyncGenerator

from backend.pipeline.nim_client import NimClient
from backend.pipeline.evidence_verifier import EvidenceVerifier
from backend.pipeline.stage_1_generation import run_stage_1
from backend.pipeline.stage_2_critical_review import run_stage_2
from backend.pipeline.stage_3_deep_reasoning import run_stage_3
from backend.pipeline.stage_4_consistency import run_stage_4
from backend.pipeline.final_engine import build_final_report, FinalReport

logger = logging.getLogger("nj.pipeline.orchestrator")


# ── Pipeline modes ─────────────────────────────────────────────────────────


class PipelineMode(str, Enum):
    FAST = "fast"
    DEEP = "deep"


# ── Pipeline run state ─────────────────────────────────────────────────────


class PipelineStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class PipelineRun:
    """Tracks the state of a single pipeline execution."""

    run_id: str = ""
    query: str = ""
    mode: PipelineMode = PipelineMode.FAST
    case_id: str | None = None
    context: dict[str, Any] = field(default_factory=dict)

    status: PipelineStatus = PipelineStatus.PENDING
    current_stage: str = ""
    stages_completed: list[str] = field(default_factory=list)
    error: str | None = None

    started_at: float = 0.0
    completed_at: float = 0.0
    processing_time_ms: float = 0.0

    stage_outputs: dict[str, Any] = field(default_factory=dict)
    final_report: dict[str, Any] | None = None

    # SSE event queue for streaming
    _event_queue: asyncio.Queue = field(default_factory=asyncio.Queue, repr=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "query": self.query,
            "mode": self.mode.value,
            "case_id": self.case_id,
            "status": self.status.value,
            "current_stage": self.current_stage,
            "stages_completed": self.stages_completed,
            "error": self.error,
            "processing_time_ms": self.processing_time_ms,
            "final_report": self.final_report,
        }


# ── Event emission ─────────────────────────────────────────────────────────


async def _emit_event(
    run: PipelineRun,
    event_type: str,
    stage: str | None = None,
    progress: float | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    """Emit an SSE event to the run's event queue."""
    event = {
        "type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "run_id": run.run_id,
    }
    if stage:
        event["stage"] = stage
    if progress is not None:
        event["progress"] = progress
    if data:
        event["data"] = data

    await run._event_queue.put(event)
    logger.debug("[SSE] Emitted: %s (stage=%s)", event_type, stage)


# ── Fast mode pipeline ─────────────────────────────────────────────────────


async def _run_fast_mode(
    run: PipelineRun,
    client: NimClient,
    verifier: EvidenceVerifier,
) -> FinalReport:
    """Fast mode: Stage 1 → verify → Stage 4 → final."""
    run.current_stage = "stage_1_generation"
    await _emit_event(run, "stage_start", stage="stage_1_generation", progress=0.0)

    t_start = time.time()

    # Stage 1: Draft investigation report
    stage1_output = await run_stage_1(
        query=run.query,
        client=client,
        evidence_verifier=verifier,
        case_id=run.case_id,
        context=run.context,
    )
    run.stage_outputs["stage_1"] = {
        "hypothesis": stage1_output.hypothesis,
        "claims": stage1_output.claims,
        "entities": stage1_output.entities,
    }
    run.stages_completed.append("stage_1_generation")

    # Check if all claims were contradicted
    if stage1_output.verification:
        ver = stage1_output.verification
        if ver.pass_rate == 0:
            run.error = "All claims contradicted — investigation query may be invalid"
            await _emit_event(run, "stage_error", stage="stage_1_generation", data={"error": run.error})
            # Continue anyway with the final report showing the issue

    await _emit_event(
        run,
        "stage_complete",
        stage="stage_1_generation",
        progress=0.33,
        data={
            "claims_count": len(stage1_output.claims),
            "verified_count": (
                len(stage1_output.verification.verified_claims)
                if stage1_output.verification else 0
            ),
        },
    )

    # Stage 4: Consistency check
    run.current_stage = "stage_4_consistency"
    await _emit_event(run, "stage_start", stage="stage_4_consistency", progress=0.35)

    stage4_output = await run_stage_4(
        stage1_output=run.stage_outputs["stage_1"],
        client=client,
    )
    run.stage_outputs["stage_4"] = {
        "consistency_score": stage4_output.consistency_score,
        "cross_references": stage4_output.cross_references,
        "gaps": stage4_output.gaps,
        "recommendations": stage4_output.recommendations,
    }
    run.stages_completed.append("stage_4_consistency")

    await _emit_event(
        run,
        "stage_complete",
        stage="stage_4_consistency",
        progress=0.70,
        data={
            "consistency_score": stage4_output.consistency_score,
            "gaps_count": len(stage4_output.gaps),
        },
    )

    # Final assembly (deterministic, no LLM)
    run.current_stage = "final_assembly"
    await _emit_event(run, "stage_start", stage="final_assembly", progress=0.75)

    t_end = time.time()
    processing_time_ms = (t_end - t_start) * 1000

    final_report = build_final_report(
        query=run.query,
        mode="fast",
        stage1_output=run.stage_outputs.get("stage_1"),
        stage4_output=run.stage_outputs.get("stage_4"),
        verification=stage1_output.verification,
        processing_time_ms=processing_time_ms,
        report_id=run.run_id,
    )

    run.final_report = final_report.to_dict()
    run.stages_completed.append("final_assembly")
    run.processing_time_ms = processing_time_ms

    await _emit_event(
        run,
        "stage_complete",
        stage="final_assembly",
        progress=0.95,
    )

    return final_report


# ── Deep mode pipeline ─────────────────────────────────────────────────────


async def _run_deep_mode(
    run: PipelineRun,
    client: NimClient,
    verifier: EvidenceVerifier,
) -> FinalReport:
    """Deep mode: Stage 1 → verify → Stage 2 → verify → Stage 3 → verify → Stage 4 → final."""
    run.current_stage = "stage_1_generation"
    await _emit_event(run, "stage_start", stage="stage_1_generation", progress=0.0)

    t_start = time.time()

    # Stage 1: Draft investigation report
    stage1_output = await run_stage_1(
        query=run.query,
        client=client,
        evidence_verifier=verifier,
        case_id=run.case_id,
        context=run.context,
    )
    run.stage_outputs["stage_1"] = {
        "hypothesis": stage1_output.hypothesis,
        "claims": stage1_output.claims,
        "entities": stage1_output.entities,
    }
    run.stages_completed.append("stage_1_generation")

    await _emit_event(
        run,
        "stage_complete",
        stage="stage_1_generation",
        progress=0.15,
        data={
            "claims_count": len(stage1_output.claims),
            "verified_count": (
                len(stage1_output.verification.verified_claims)
                if stage1_output.verification else 0
            ),
        },
    )

    # Stage 2: Critical review
    run.current_stage = "stage_2_critical_review"
    await _emit_event(run, "stage_start", stage="stage_2_critical_review", progress=0.17)

    stage2_output = await run_stage_2(
        stage1_output=run.stage_outputs["stage_1"],
        client=client,
        evidence_verifier=verifier,
        case_id=run.case_id,
        context=run.context,
    )
    run.stage_outputs["stage_2"] = {
        "critique": stage2_output.critique,
        "revised_claims": stage2_output.revised_claims,
        "alternative_hypotheses": stage2_output.alternative_hypotheses,
        "weaknesses": stage2_output.weaknesses,
    }
    run.stages_completed.append("stage_2_critical_review")

    await _emit_event(
        run,
        "stage_complete",
        stage="stage_2_critical_review",
        progress=0.40,
        data={
            "revised_claims_count": len(stage2_output.revised_claims),
            "weaknesses_count": len(stage2_output.weaknesses),
        },
    )

    # Stage 3: Deep reasoning
    run.current_stage = "stage_3_deep_reasoning"
    await _emit_event(run, "stage_start", stage="stage_3_deep_reasoning", progress=0.42)

    stage3_output = await run_stage_3(
        stage1_output=run.stage_outputs["stage_1"],
        client=client,
        stage2_output=run.stage_outputs.get("stage_2"),
        evidence_verifier=verifier,
        case_id=run.case_id,
        context=run.context,
    )
    run.stage_outputs["stage_3"] = {
        "analysis": stage3_output.analysis,
        "final_claims": stage3_output.final_claims,
        "evidence_chains": stage3_output.evidence_chains,
        "patterns_detected": stage3_output.patterns_detected,
        "confidence_adjustments": stage3_output.confidence_adjustments,
    }
    run.stages_completed.append("stage_3_deep_reasoning")

    await _emit_event(
        run,
        "stage_complete",
        stage="stage_3_deep_reasoning",
        progress=0.65,
        data={
            "final_claims_count": len(stage3_output.final_claims),
            "patterns_count": len(stage3_output.patterns_detected),
        },
    )

    # Stage 4: Consistency check (includes all stages)
    run.current_stage = "stage_4_consistency"
    await _emit_event(run, "stage_start", stage="stage_4_consistency", progress=0.67)

    stage4_output = await run_stage_4(
        stage1_output=run.stage_outputs["stage_1"],
        client=client,
        stage2_output=run.stage_outputs.get("stage_2"),
        stage3_output=run.stage_outputs.get("stage_3"),
    )
    run.stage_outputs["stage_4"] = {
        "consistency_score": stage4_output.consistency_score,
        "cross_references": stage4_output.cross_references,
        "gaps": stage4_output.gaps,
        "recommendations": stage4_output.recommendations,
    }
    run.stages_completed.append("stage_4_consistency")

    await _emit_event(
        run,
        "stage_complete",
        stage="stage_4_consistency",
        progress=0.85,
        data={
            "consistency_score": stage4_output.consistency_score,
            "gaps_count": len(stage4_output.gaps),
        },
    )

    # Final assembly
    run.current_stage = "final_assembly"
    await _emit_event(run, "stage_start", stage="final_assembly", progress=0.88)

    t_end = time.time()
    processing_time_ms = (t_end - t_start) * 1000

    # Use Stage 3 final claims as primary, fall back to Stage 2, then Stage 1
    final_report = build_final_report(
        query=run.query,
        mode="deep",
        stage1_output=run.stage_outputs.get("stage_1"),
        stage2_output=run.stage_outputs.get("stage_2"),
        stage3_output=run.stage_outputs.get("stage_3"),
        stage4_output=run.stage_outputs.get("stage_4"),
        verification=stage3_output.verification or stage2_output.verification or stage1_output.verification,
        processing_time_ms=processing_time_ms,
        report_id=run.run_id,
    )

    run.final_report = final_report.to_dict()
    run.stages_completed.append("final_assembly")
    run.processing_time_ms = processing_time_ms

    await _emit_event(
        run,
        "stage_complete",
        stage="final_assembly",
        progress=0.95,
    )

    return final_report


# ── Main orchestrator ──────────────────────────────────────────────────────


async def run_pipeline(
    query: str,
    client: NimClient,
    verifier: EvidenceVerifier,
    mode: PipelineMode = PipelineMode.FAST,
    case_id: str | None = None,
    context: dict[str, Any] | None = None,
    run_id: str | None = None,
) -> AsyncGenerator[dict[str, Any], None]:
    """Run the investigation pipeline and yield SSE events.

    Args:
        query: Officer's investigation query.
        client: NIM API client.
        verifier: Evidence verifier.
        mode: Pipeline mode (fast or deep).
        case_id: Optional case ID.
        context: Optional context.
        run_id: Optional run ID (auto-generated if not provided).

    Yields:
        SSE event dicts for streaming to frontend.
    """
    run = PipelineRun(
        run_id=run_id or str(uuid.uuid4()),
        query=query,
        mode=mode,
        case_id=case_id,
        context=context or {},
    )

    # Emit initial event
    await _emit_event(run, "pipeline_start", progress=0.0)

    try:
        run.status = PipelineStatus.RUNNING
        run.started_at = time.time()

        if mode == PipelineMode.FAST:
            final_report = await _run_fast_mode(run, client, verifier)
        else:
            final_report = await _run_deep_mode(run, client, verifier)

        run.status = PipelineStatus.COMPLETED
        run.completed_at = time.time()

        # Final event with complete report
        await _emit_event(
            run,
            "pipeline_complete",
            progress=1.0,
            data=run.final_report,
        )

    except NotImplementedError:
        run.status = PipelineStatus.FAILED
        run.error = "Deep mode not yet implemented"
        await _emit_event(run, "pipeline_error", data={"error": run.error})

    except Exception as e:
        run.status = PipelineStatus.FAILED
        run.error = str(e)
        run.completed_at = time.time()
        logger.error("[PIPELINE] Failed: %s", str(e))
        await _emit_event(run, "pipeline_error", data={"error": str(e)})

    # Drain event queue
    while not run._event_queue.empty():
        event = await run._event_queue.get()
        yield event

    # Always yield the run state as final event
    yield {"type": "run_state", "data": run.to_dict()}
