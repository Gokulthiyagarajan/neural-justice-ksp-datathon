"""AI Orchestrator — route requests to the configured provider.

The orchestrator reads ``AIConfig`` (populated from env vars), selects the
appropriate provider from the registry, and delegates every ``chat()`` call
to it.  A fallback mock provider is available when ``MOCK_AI=true``.
"""

from __future__ import annotations

import logging
import time
import typing as t
from dataclasses import dataclass

from .config import AIConfig

if t.TYPE_CHECKING:
    from .providers.base import BaseAIProvider

logger = logging.getLogger("nj.ai.orchestrator")


@dataclass
class ChatResponse:
    """Normalised response from any provider."""

    content: str
    finish_reason: str = "stop"
    usage: dict[str, int] | None = None
    latency_ms: float = 0.0
    provider: str = ""


class _MockProvider:
    """Fallback mock used when ``MOCK_AI=true``.

    Returns deterministic responses so the frontend can be developed
    without a live LLM key.
    """

    def __init__(self, config: AIConfig) -> None:
        self._cfg = config

    def chat(self, messages: list[dict[str, str]], **kwargs: t.Any) -> dict[str, t.Any]:
        query = messages[-1]["content"] if messages else ""
        return {
            "content": (
                f"[MOCK] Received: \"{query[:80]}{'…' if len(query) > 80 else ''}\".\n\n"
                "This is a simulated response.  Set MOCK_AI=false and configure "
                "a real provider (Ollama / QuickML) for genuine AI responses."
            ),
            "finish_reason": "stop",
        }

    def health(self) -> dict[str, t.Any]:
        return {"provider": "mock", "status": "healthy — mock mode"}

    def close(self) -> None:
        pass


class AIOrchestrator:
    """Singleton-ish orchestrator; create once, reuse across requests."""

    def __init__(self, config: AIConfig | None = None) -> None:
        self._cfg = config or AIConfig()
        self._provider: BaseAIProvider | _MockProvider | None = None
        self._initialised = False

    # ── Lazy initialisation ───────────────────────────────────────────────

    def _ensure_provider(self) -> BaseAIProvider | _MockProvider:
        if self._provider is not None:
            return self._provider

        if self._cfg.mock_ai:
            logger.warning("MOCK_AI=true — using mock provider")
            self._provider = _MockProvider(self._cfg)
            self._initialised = True
            return self._provider

        # Load real provider from registry
        provider_name = self._cfg.provider
        try:
            from .providers import get_provider_class

            klass = get_provider_class(provider_name)
            if klass is None:
                raise ValueError(
                    f"Unknown AI provider {provider_name!r}. "
                    f"Available: {', '.join(get_provider_class('') or [])}"
                )

            self._provider = klass(self._cfg)
            self._initialised = True
            logger.info(
                "AI provider initialised: %s",
                provider_name,
            )
            return self._provider

        except Exception:
            logger.exception(
                "Failed to initialise provider %r — falling back to mock",
                provider_name,
            )
            self._provider = _MockProvider(self._cfg)
            self._initialised = True
            return self._provider

    # ── Public API ─────────────────────────────────────────────────────────

    def chat(
        self,
        messages: list[dict[str, str]],
        **kwargs: t.Any,
    ) -> ChatResponse:
        """Send a chat request to the active provider.

        Parameters
        ----------
        messages : list[dict[str, str]]
            Standard ChatML message array.
        **kwargs
            Passed through to the underlying provider.

        Returns
        -------
        ChatResponse
            Normalised response with content, timing, and metadata.
        """
        provider = self._ensure_provider()
        t0 = time.monotonic()

        try:
            result = provider.chat(messages, **kwargs)
            latency = (time.monotonic() - t0) * 1000

            return ChatResponse(
                content=result.get("content", ""),
                finish_reason=result.get("finish_reason", "stop"),
                usage=result.get("usage"),
                latency_ms=round(latency, 1),
                provider=self._cfg.provider if not self._cfg.mock_ai else "mock",
            )

        except Exception:
            logger.exception("AI chat request failed")
            latency = (time.monotonic() - t0) * 1000
            return ChatResponse(
                content="I'm sorry, the AI service is currently unavailable. "
                "Please try again later.",
                finish_reason="error",
                latency_ms=round(latency, 1),
                provider="error",
            )

    def health(self) -> dict[str, t.Any]:
        """Return health status of the underlying provider."""
        provider = self._ensure_provider()
        base = provider.health()
        base.update(
            {
                "config": {
                    "provider": self._cfg.provider,
                    "mock_ai": self._cfg.mock_ai,
                    "timeout_ms": self._cfg.timeout_ms,
                    "max_retries": self._cfg.max_retries,
                    "cache_enabled": self._cfg.enable_cache,
                }
            }
        )
        return base

    def close(self) -> None:
        if self._provider is not None:
            try:
                self._provider.close()
            except Exception:
                logger.exception("Error closing AI provider")
            self._provider = None
