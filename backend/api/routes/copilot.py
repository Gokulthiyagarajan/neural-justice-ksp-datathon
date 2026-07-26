"""FastAPI route — AI Copilot (Drishti) backed by QuickML / Zoho Catalyst LLM.

``POST /api/ai/copilot``
    Accepts a chat request and returns the AI response.

    Request body (JSON)::

        {
            "messages": [{"role": "user", "content": "..."}],
            "temperature": 0.7,
            "max_tokens": 2048,
            "instructions": "optional system-level instruction",
            "mode": "fir_search" | "statistical" | "pattern_query"
        }

    Response (JSON)::

        {
            "success": true,
            "data": {
                "content": "...",
                "finish_reason": "stop",
                "latency_ms": 1234.5,
                "provider": "quickml",
                "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}
            }
        }
"""

from __future__ import annotations

import logging
import typing as t

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.ai import AIConfig, AIOrchestrator

logger = logging.getLogger("nj.api.routes.copilot")

router = APIRouter(prefix="/api/ai", tags=["AI Copilot"])

# ── Singleton orchestrator (lazy-initialised on first request) ─────────────
_orchestrator: AIOrchestrator | None = None


def _get_orchestrator() -> AIOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        config = AIConfig()
        _orchestrator = AIOrchestrator(config)
        logger.info(
            "AI Orchestrator initialised (provider=%s, mock=%s)",
            config.provider,
            config.mock_ai,
        )
    return _orchestrator


# ── Request / response schemas ────────────────────────────────────────────


class CopilotRequest(BaseModel):
    messages: list[dict[str, str]] = Field(
        ...,
        min_length=1,
        description="ChatML message array, e.g. [{\"role\": \"user\", \"content\": \"...\"}]",
    )
    temperature: float | None = Field(None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(None, ge=1, le=8192)
    top_p: float | None = Field(None, ge=0.0, le=1.0)
    instructions: str | None = None
    mode: str | None = Field(
        None,
        description="Query mode: fir_search | statistical | pattern_query",
    )


class CopilotResponse(BaseModel):
    success: bool = True
    data: dict[str, t.Any]


class ErrorResponse(BaseModel):
    success: bool = False
    error: str


# ── Route ─────────────────────────────────────────────────────────────────


@router.post(
    "/copilot",
    response_model=CopilotResponse | ErrorResponse,
    summary="Send a chat request to the AI Copilot (Drishti)",
)
async def copilot_chat(req: CopilotRequest) -> CopilotResponse | ErrorResponse:
    """Send a user query to the configured AI provider (QuickML / Ollama).

    The orchestrator selects the provider based on ``AI_PROVIDER`` and
    ``MOCK_AI`` environment variables.  In mock mode, deterministic responses
    are returned without any external API call.
    """
    try:
        orch = _get_orchestrator()

        # Build kwargs from optional request fields
        kwargs: dict[str, t.Any] = {}
        if req.temperature is not None:
            kwargs["temperature"] = req.temperature
        if req.max_tokens is not None:
            kwargs["max_tokens"] = req.max_tokens
        if req.top_p is not None:
            kwargs["top_p"] = req.top_p
        if req.instructions:
            kwargs["instructions"] = req.instructions
        if req.mode:
            kwargs["mode"] = req.mode

        result = orch.chat(req.messages, **kwargs)

        return CopilotResponse(
            success=True,
            data={
                "content": result.content,
                "finish_reason": result.finish_reason,
                "latency_ms": result.latency_ms,
                "provider": result.provider,
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
    summary="Check AI backend health",
)
async def copilot_health() -> dict[str, t.Any]:
    """Health-check endpoint for the AI subsystem."""
    try:
        orch = _get_orchestrator()
        return orch.health()
    except Exception as exc:
        return {"status": "unhealthy", "error": str(exc)}
