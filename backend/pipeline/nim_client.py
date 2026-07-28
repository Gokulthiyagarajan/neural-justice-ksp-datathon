"""NVIDIA NIM API client wrapper with retry, timeout, and logging.

All pipeline model calls go through this module. Every call:
- Uses exponential backoff retry (max 3 attempts) on 429/503.
- Logs latency and token usage per call.
- Has a configurable timeout (default 45s).
- Fails loud with a typed exception.

Usage::

    from backend.pipeline.nim_client import NimClient, NimError

    client = NimClient(api_key="nvapi-...")
    result = await client.chat(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": "Hello"}],
        stage_name="generation",
    )
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

logger = logging.getLogger("nj.pipeline.nim")

# ── Constants ──────────────────────────────────────────────────────────────

NIM_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEFAULT_TIMEOUT = 45.0  # seconds
MAX_RETRIES = 3
INITIAL_BACKOFF = 1.0  # seconds
BACKOFF_MULTIPLIER = 2.0
RETRYABLE_STATUS_CODES = {429, 503}


# ── Exceptions ─────────────────────────────────────────────────────────────


class NimError(Exception):
    """Raised when a NIM API call fails after all retries."""

    def __init__(
        self,
        stage_name: str,
        model: str,
        status_code: int | None = None,
        message: str = "",
        attempts: int = 0,
    ):
        self.stage_name = stage_name
        self.model = model
        self.status_code = status_code
        self.attempts = attempts
        super().__init__(
            f"NIM call failed at stage '{stage_name}' "
            f"(model={model}, status={status_code}, attempts={attempts}): {message}"
        )


# ── Response dataclass ─────────────────────────────────────────────────────


@dataclass
class NimResponse:
    """Structured response from a NIM API call."""

    content: str
    model: str
    stage_name: str
    finish_reason: str | None = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def usage(self) -> dict[str, int]:
        return {
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
        }


# ── Client ─────────────────────────────────────────────────────────────────


class NimClient:
    """Async client for NVIDIA NIM chat completions API.

    Args:
        api_key: NIM API key. Falls back to NIM_API_KEY env var.
        base_url: Override for the API endpoint URL.
        timeout: Request timeout in seconds (default 45).
        max_retries: Maximum retry attempts on 429/503 (default 3).
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = MAX_RETRIES,
    ):
        self.api_key = api_key or os.environ.get("NIM_API_KEY", "")
        self.base_url = base_url or NIM_BASE_URL
        self.timeout = timeout
        self.max_retries = max_retries

        if not self.api_key:
            logger.warning("NIM_API_KEY not set — NIM calls will fail with 401")

    async def chat(
        self,
        model: str,
        messages: list[dict[str, str]],
        stage_name: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        response_format: dict[str, str] | None = None,
    ) -> NimResponse:
        """Send a chat completion request with retry and timeout.

        Args:
            model: NIM model identifier (e.g. 'openai/gpt-oss-120b').
            messages: ChatML message array.
            stage_name: Human-readable stage name for logging and error reporting.
            temperature: Sampling temperature (default 0.3 for deterministic output).
            max_tokens: Maximum tokens in response.
            response_format: Optional response format spec (e.g. {"type": "json_object"}).

        Returns:
            NimResponse with parsed content and metadata.

        Raises:
            NimError: If the call fails after all retries.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format

        last_error: Exception | None = None
        latency_ms = 0.0

        for attempt in range(1, self.max_retries + 1):
            start = time.monotonic()
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(self.timeout)
                ) as client:
                    response = await client.post(
                        self.base_url,
                        json=payload,
                        headers=headers,
                    )
                    latency_ms = (time.monotonic() - start) * 1000

                    if response.status_code in RETRYABLE_STATUS_CODES:
                        retry_after = float(
                            response.headers.get("Retry-After", INITIAL_BACKOFF)
                        )
                        backoff = max(retry_after, INITIAL_BACKOFF * (BACKOFF_MULTIPLIER ** (attempt - 1)))
                        logger.warning(
                            "[NIM] %s/%s attempt %d/%d got %d — retrying in %.1fs",
                            stage_name, model, attempt, self.max_retries,
                            response.status_code, backoff,
                        )
                        await asyncio.sleep(backoff)
                        continue

                    if response.status_code != 200:
                        raise NimError(
                            stage_name=stage_name,
                            model=model,
                            status_code=response.status_code,
                            message=response.text[:500],
                            attempts=attempt,
                        )

                    data = response.json()
                    return self._parse_response(data, model, stage_name, latency_ms)

            except (httpx.TimeoutException, httpx.ConnectError) as e:
                latency_ms = (time.monotonic() - start) * 1000
                last_error = e
                backoff = INITIAL_BACKOFF * (BACKOFF_MULTIPLIER ** (attempt - 1))
                logger.warning(
                    "[NIM] %s/%s attempt %d/%d timeout/connect error — retrying in %.1fs: %s",
                    stage_name, model, attempt, self.max_retries, backoff, str(e)[:200],
                )
                await asyncio.sleep(backoff)
                continue

        # All retries exhausted
        raise NimError(
            stage_name=stage_name,
            model=model,
            status_code=None,
            message=str(last_error) or "All retries exhausted",
            attempts=self.max_retries,
        )

    def _parse_response(
        self,
        data: dict[str, Any],
        model: str,
        stage_name: str,
        latency_ms: float,
    ) -> NimResponse:
        """Parse the NIM API response into a structured NimResponse."""
        choices = data.get("choices", [])
        if not choices:
            raise NimError(
                stage_name=stage_name,
                model=model,
                status_code=200,
                message="Empty choices array in response",
                attempts=1,
            )

        choice = choices[0]
        message = choice.get("message", {})
        content = message.get("content", "")
        finish_reason = choice.get("finish_reason")

        usage = data.get("usage", {})

        nim_response = NimResponse(
            content=content,
            model=data.get("model", model),
            stage_name=stage_name,
            finish_reason=finish_reason,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            latency_ms=latency_ms,
            raw=data,
        )

        # Log the call
        logger.info(
            "[NIM] %s/%s completed in %.0fms — tokens: %d/%d/%d (prompt/completion/total), finish: %s",
            stage_name, nim_response.model,
            latency_ms,
            nim_response.prompt_tokens,
            nim_response.completion_tokens,
            nim_response.total_tokens,
            finish_reason,
        )

        return nim_response


# ── Model constants ─────────────────────────────────────────────────────────

class Models:
    """NIM model identifiers for each pipeline stage."""

    # Stage 1 — Generation (draft investigation report)
    GENERATION = "openai/gpt-oss-120b"

    # Stage 2 — Critical Review (challenge assumptions)
    CRITICAL_REVIEW = "nvidia/nemotron-3-ultra-550b-a55b"

    # Stage 3 — Deep Reasoning (timeline validation, contradiction detection)
    DEEP_REASONING = "deepseek-ai/deepseek-r1"

    # Stage 4 — Consistency Pass (deduplicate, resolve conflicts)
    CONSISTENCY = "nvidia/nemotron-mini-4b-instruct"
