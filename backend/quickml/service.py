"""Standalone QuickML service — direct access to Zoho Catalyst LLM Serving.

Use this module when you need to call QuickML outside of the AI provider
layer (e.g. from serverless functions, scheduled jobs, or management CLI).
For the main app, use ``AIOrchestrator`` (``backend.ai.orchestrator``), which
delegates to ``QuickMLProvider`` internally.

Usage::

    from backend.quickml.service import QuickMLService

    svc = QuickMLService(
        client_id="...",
        client_secret="...",
        endpoint_url="https://api.catalyst.zoho.in/quickml/v1/project/.../glm/chat",
        org_id="60077006311",
        endpoint_key="...",
    )
    resp = svc.chat([{"role": "user", "content": "Hello"}])
    print(resp["content"])
"""

from __future__ import annotations

import logging
import time
import typing as t
from urllib.parse import urlparse

import requests

logger = logging.getLogger("nj.quickml.service")

TOKEN_REFRESH_MARGIN_S: int = 300

# SECURITY (F-018/F-019): outbound calls carry Authorization headers, so an
# attacker-controlled endpoint URL would leak secrets (SSRF). Only allow https
# and a small set of trusted Zoho/Catalyst hosts.
ALLOWED_OUTBOUND_HOSTS = {
    "api.catalyst.zoho.in",
    "api.catalyst.zoho.com",
    "accounts.zoho.in",
    "accounts.zoho.com",
}


def _validate_outbound_url(url: str, what: str = "endpoint") -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise QuickMLServiceError(f"{what} must use https, got {parsed.scheme!r}")
    if parsed.hostname not in ALLOWED_OUTBOUND_HOSTS:
        raise QuickMLServiceError(
            f"{what} host not allowed: {parsed.hostname!r}. "
            f"Allowed: {sorted(ALLOWED_OUTBOUND_HOSTS)}"
        )


class QuickMLServiceError(Exception):
    """Base exception for QuickML service errors."""


class _OAuthToken:
    __slots__ = ("access_token", "expires_at")

    def __init__(self, access_token: str, expires_in: int) -> None:
        self.access_token = access_token
        self.expires_at = time.time() + expires_in

    @property
    def expired(self) -> bool:
        return time.time() >= (self.expires_at - TOKEN_REFRESH_MARGIN_S)


class QuickMLService:
    """Direct QuickML API client with automatic OAuth token management."""

    def __init__(
        self,
        *,
        client_id: str,
        client_secret: str,
        endpoint_url: str,
        org_id: str,
        endpoint_key: str = "",
        oauth_url: str = "https://accounts.zoho.in/oauth/v2/token",
        oauth_scope: str = "QuickML.deployment.READ",
        environment: str = "Development",
        timeout_s: int = 60,
    ) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        _validate_outbound_url(endpoint_url, "endpoint_url")
        self._endpoint_url = endpoint_url
        self._org_id = org_id
        self._endpoint_key = endpoint_key
        _validate_outbound_url(oauth_url, "oauth_url")
        self._oauth_url = oauth_url
        self._oauth_scope = oauth_scope
        self._environment = environment
        self._timeout_s = timeout_s

        self._http = requests.Session()
        self._http.headers.update(
            {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "NeuralJustice-QuickML/1.0",
            }
        )
        self._token: _OAuthToken | None = None

        logger.info(
            "QuickML service initialised (endpoint: %s)", self._endpoint_url
        )

    # ── Public API ─────────────────────────────────────────────────────────

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
        top_p: float | None = None,
        instructions: str | None = None,
        chat_template_kwargs: dict[str, t.Any] | None = None,
    ) -> dict[str, t.Any]:
        """Send a chat request to the QuickML GLM endpoint.

        Returns a dict with keys ``content``, ``finish_reason``,
        and optionally ``usage``.
        """
        payload: dict[str, t.Any] = {"messages": messages}
        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if top_p is not None:
            payload["top_p"] = top_p
        if instructions:
            payload["instructions"] = instructions
        if chat_template_kwargs:
            payload["chat_template_kwargs"] = chat_template_kwargs

        headers = self._build_headers()
        last_error: Exception | None = None

        for attempt in range(1, 4):  # up to 3 attempts
            try:
                resp = self._http.post(
                    self._endpoint_url,
                    json=payload,
                    headers=headers,
                    timeout=self._timeout_s,
                )

                if resp.status_code in (401, 403):
                    logger.warning("Token expired, refreshing (attempt %d)", attempt)
                    self._token = None
                    headers = self._build_headers(force_refresh=True)
                    continue

                if resp.status_code == 429:
                    wait = min(2**attempt, 30)
                    logger.warning("Rate limited, retrying in %ds", wait)
                    time.sleep(wait)
                    continue

                resp.raise_for_status()
                return self._parse_response(resp.json())

            except (requests.ConnectionError, requests.Timeout) as exc:
                last_error = exc
                logger.warning("Network error (attempt %d): %s", attempt, exc)
                time.sleep(min(2**attempt, 5))
                continue

        raise QuickMLServiceError(
            f"QuickML request failed after retries: {last_error}"
        ) from last_error

    def health(self) -> dict[str, t.Any]:
        """Quick health check."""
        ok = bool(self._endpoint_url)
        try:
            self._ensure_token()
            token_ok = self._token is not None
        except Exception:
            token_ok = False

        return {
            "service": "quickml",
            "endpoint_configured": ok,
            "token_obtained": token_ok,
            "healthy": ok and token_ok,
        }

    def close(self) -> None:
        self._http.close()

    # ── OAuth ──────────────────────────────────────────────────────────────

    def _ensure_token(self) -> str:
        if self._token is not None and not self._token.expired:
            return self._token.access_token
        return self._refresh_token()

    def _refresh_token(self) -> str:
        data = {
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "grant_type": "client_credentials",
            "scope": self._oauth_scope,
        }
        logger.info("Exchanging client credentials for OAuth token")
        resp = requests.post(
            self._oauth_url,
            data=data,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout=15,
        )
        if not resp.ok:
            raise QuickMLServiceError(
                f"OAuth failed (HTTP {resp.status_code}): {resp.text[:500]}"
            )

        body = resp.json()
        access_token = body.get("access_token")
        if not access_token:
            raise QuickMLServiceError(f"No access_token in OAuth response: {body}")

        expires_in = int(body.get("expires_in", 3600))
        self._token = _OAuthToken(access_token, expires_in)
        logger.info("OAuth token obtained (expires in %ds)", expires_in)
        return access_token

    def _build_headers(
        self, force_refresh: bool = False
    ) -> dict[str, str]:
        if force_refresh:
            self._token = None
        token = self._ensure_token()

        headers: dict[str, str] = {
            "Authorization": f"Zoho-oauthtoken {token}",
            "CATALYST-ORG": self._org_id,
            "Environment": self._environment,
        }
        if self._endpoint_key:
            headers["X-QUICKML-ENDPOINT-KEY"] = self._endpoint_key
        return headers

    # ── Parsing ───────────────────────────────────────────────────────────

    @staticmethod
    def _parse_response(data: dict[str, t.Any]) -> dict[str, t.Any]:
        choices = data.get("choices", [])
        if not choices:
            content = data.get("content") or data.get("response") or str(data)
            return {"content": content, "finish_reason": "stop"}

        choice = choices[0]
        message = choice.get("message", {})
        result: dict[str, t.Any] = {
            "content": message.get("content", ""),
            "finish_reason": choice.get("finish_reason", "stop"),
        }
        usage = data.get("usage")
        if usage:
            result["usage"] = usage
        return result
