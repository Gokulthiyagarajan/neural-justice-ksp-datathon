"""FastAPI route — AI Copilot (Drishti) backed by CopilotService layer.

``POST /api/ai/copilot``
    Accepts a chat request and returns the AI response with enriched context,
    role-aware prompts, and structured metadata (cited cards, charts, confidence).

    Request body (JSON)::

        {
            "messages": [{"role": "user", "content": "..."}],
            "user_role": "SP",
            "mode": "fir_search",
            "language": "en",
            "session_id": "optional-session-id",
            "temperature": 0.7,
            "max_tokens": 2048
        }

    Response (JSON)::

        {
            "success": true,
            "data": {
                "content": "...",
                "finish_reason": "stop",
                "confidence": 85.0,
                "cited_cards": ["todays-firs", "crime-index"],
                "chart_data": {"type": "bar", "labels": ["Jan","Feb"], "data": [45, 67]},
                "latency_ms": 450.2,
                "provider": "quickml",
                "session_id": "copilot-abc123",
                "usage": {"prompt_tokens": 200, "completion_tokens": 100, "total_tokens": 300}
            }
        }
"""

from __future__ import annotations

import logging
import typing as t

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.ai.copilot import CopilotService

logger = logging.getLogger("nj.api.routes.copilot")

router = APIRouter(prefix="/api/ai", tags=["AI Copilot"])

# ── Singleton copilot service (lazy-initialised on first request) ─────────
_copilot_service: CopilotService | None = None


def _get_service() -> CopilotService:
    global _copilot_service
    if _copilot_service is None:
        _copilot_service = CopilotService()
        logger.info("CopilotService initialised")
    return _copilot_service


# ── Request / response schemas ────────────────────────────────────────────


class CopilotRequest(BaseModel):
    messages: list[dict[str, str]] = Field(
        ...,
        min_length=1,
        description="ChatML message array, e.g. [{\"role\": \"user\", \"content\": \"...\"}]",
    )
    user_role: str = Field(
        "IO",
        description="KSP role key (CP, SP, PI, PSI, PC, IO, etc.)",
    )
    mode: str = Field(
        "general",
        description="Query mode: general | fir_search | case_analysis | pattern_query | statistical | nl2sql | network_analysis | forecast | resource_planning | intelligence_analysis",
    )
    language: str = Field(
        "en",
        description="Response language: 'en' for English, 'kn' for Kannada",
    )
    session_id: str | None = Field(
        None,
        description="Existing session ID to continue a conversation",
    )
    temperature: float | None = Field(None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(None, ge=1, le=8192)
    include_dashboard_context: bool = Field(
        True,
        description="Include real-time dashboard metrics in context",
    )
    include_alerts: bool = Field(
        True,
        description="Include active early-warning alerts in context",
    )


class CopilotResponse(BaseModel):
    success: bool = True
    data: dict[str, t.Any]


class ErrorResponse(BaseModel):
    success: bool = False
    error: str


# ── Routes ─────────────────────────────────────────────────────────────────


@router.post(
    "/copilot",
    response_model=CopilotResponse | ErrorResponse,
    summary="Send a chat request to the AI Copilot (Drishti)",
)
async def copilot_chat(req: CopilotRequest) -> CopilotResponse | ErrorResponse:
    """Send a user query to the AI Copilot with role-aware context.

    The CopilotService enriches every request with:
    - Role-based system prompts tailored to the user's rank
    - Real-time dashboard context (crime metrics, alerts, hotspots)
    - Query-specific context based on keywords
    - Session management for multi-turn conversations
    - Structured metadata extraction (cited cards, charts, confidence)
    """
    try:
        svc = _get_service()

        result = svc.chat(
            messages=req.messages,
            user_role=req.user_role,
            mode=req.mode,
            lang=req.language,
            session_id=req.session_id,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            include_dashboard_context=req.include_dashboard_context,
            include_alerts=req.include_alerts,
        )

        return CopilotResponse(
            success=True,
            data={
                "content": result.content,
                "finish_reason": result.finish_reason,
                "confidence": result.confidence,
                "cited_cards": result.cited_cards,
                "chart_data": result.chart_data,
                "latency_ms": result.latency_ms,
                "provider": result.provider,
                "session_id": result.session_id,
                "usage": result.usage,
            },
        )

    except Exception as exc:
        logger.exception("AI copilot request failed")
        return ErrorResponse(
            success=False,
            error=f"AI service unavailable: {exc}",
        )


@router.get(
    "/copilot/health",
    summary="Check AI Copilot system health",
)
async def copilot_health() -> dict[str, t.Any]:
    """Health-check endpoint for the AI Copilot subsystem."""
    try:
        svc = _get_service()
        return svc.health()
    except Exception as exc:
        return {"status": "unhealthy", "error": str(exc)}


@router.get(
    "/copilot/sessions",
    summary="List recent conversation sessions",
)
async def list_sessions(limit: int = 20) -> dict[str, t.Any]:
    """List the most recent Copilot conversation sessions."""
    try:
        svc = _get_service()
        sessions = svc.list_sessions(limit=limit)
        return {
            "success": True,
            "data": [
                {
                    "session_id": s.session_id,
                    "role_key": s.role_key,
                    "mode": s.mode,
                    "title": s.title,
                    "message_count": s.message_count,
                    "created_at": s.created_at.isoformat(),
                }
                for s in sessions
            ],
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@router.delete(
    "/copilot/sessions/{session_id}",
    summary="Delete a conversation session",
)
async def delete_session(session_id: str) -> dict[str, t.Any]:
    """Delete a specific Copilot conversation session."""
    try:
        svc = _get_service()
        deleted = svc.delete_session(session_id)
        return {
            "success": deleted,
            "message": "Session deleted" if deleted else "Session not found",
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}
