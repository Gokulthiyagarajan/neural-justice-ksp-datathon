"""Abstract base provider for LLM/AI backends in Neural Justice."""

from __future__ import annotations

import abc
import time
import logging
from typing import Any

logger = logging.getLogger("nj.ai.providers.base")


class BaseAIProvider(abc.ABC):
    """Abstract interface every AI provider must implement.

    Providers are loaded dynamically by the orchestrator based on
    ``AI_PROVIDER`` (or ``config.provider``).  Each provider owns its
    own authentication, retry logic, and token lifecycle.
    """

    # ── Lifecycle ──────────────────────────────────────────────────────────

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}
        self._name = self.__class__.__name__

    # ── Required overrides ─────────────────────────────────────────────────

    @abc.abstractmethod
    def chat(self, messages: list[dict[str, str]], **kwargs: Any) -> dict[str, Any]:
        """Send a chat completion request.

        Parameters
        ----------
        messages : list[dict[str, str]]
            Standard ChatML format, e.g. ``[{"role": "user", "content": "..."}]``.
        **kwargs
            Provider-specific parameters (*e.g.* ``temperature``, ``max_tokens``).

        Returns
        -------
        dict
            At minimum a ``{"content": "..."}`` key.  Providers MAY also return
            ``"finish_reason"``, ``"usage"``, or other metadata.
        """
        ...

    # ── Optional overrides ─────────────────────────────────────────────────

    def health(self) -> dict[str, Any]:
        """Return a lightweight health-check payload."""
        return {"provider": self._name, "status": "unknown"}

    def close(self) -> None:
        """Release any held resources (sessions, connections, …)."""
        ...

    # ── Helpers ────────────────────────────────────────────────────────────

    def _log(self, level: int, msg: str, **extra: Any) -> None:
        extra.setdefault("provider", self._name)
        logger.log(level, "%s | %s", self._name, msg, extra=extra)
