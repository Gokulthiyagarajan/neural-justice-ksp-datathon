"""QuickML LLM provider — Zoho Catalyst Generative AI (GLM chat).

Authentication
--------------
Uses the **Zoho OAuth2 client_credentials** grant:

    1. Exchange ``client_id`` + ``client_secret`` for an ``access_token``
       (valid 3600 s) via ``POST https://accounts.zoho.in/oauth/v2/token``.
    2. Cache the token; auto-refresh 5 min before expiry.
    3. Send it as ``Authorization: Zoho-oauthtoken <token>`` on every request.

Required headers (per Catalyst docs)
-------------------------------------
- ``Authorization: Zoho-oauthtoken <access_token>``
- ``X-QUICKML-ENDPOINT-KEY`` (per-deployment key from Console)
- ``CATALYST-ORG`` (organisation ID)
- ``Environment`` (``Development`` | ``Production``)

NOTE on the "Bearer vs Zoho-oauthtoken" ambiguity
---------------------------------------------------
The Zoho OAuth2 token endpoint returns ``"token_type": "Bearer"``, so the
auto-generated sample code in the Catalyst Console uses ``Bearer``.  However,
the **QuickML Pipeline Endpoints** documentation explicitly requires the
``Zoho-oauthtoken`` prefix.  We follow the official documentation.
"""

from __future__ import annotations

import logging
import time
import typing as t
from dataclasses import dataclass

import requests

from .base import BaseAIProvider

if t.TYPE_CHECKING:
    from ..config import AIConfig

logger = logging.getLogger("nj.ai.providers.quickml")

# How many seconds before token expiry to trigger a refresh
TOKEN_REFRESH_MARGIN_S: int = 300  # 5 min


# ── Exceptions ─────────────────────────────────────────────────────────────


class QuickMLError(Exception):
    """Base exception for QuickML errors."""


class QuickMLAuthError(QuickMLError):
    """Authentication / token-exchange failure."""


class QuickMLRequestError(QuickMLError):
    """API response indicates failure or model error."""


# ── Token response (internal) ──────────────────────────────────────────────


@dataclass
class _OAuthToken:
    access_token: str
    expires_at: float  # unix epoch seconds

    @property
    def expired(self) -> bool:
        return time.time() >= (self.expires_at - TOKEN_REFRESH_MARGIN_S)


# ── Provider ───────────────────────────────────────────────────────────────


class QuickMLProvider(BaseAIProvider):
    """QuickML LLM provider backed by Zoho Catalyst Generative AI."""

    def __init__(self, config: AIConfig | None = None) -> None:
        # Accept either an AIConfig or a raw dict for backward compat
        from ..config import AIConfig as _AIConfig

        if config is None:
            config = _AIConfig()
        elif isinstance(config, dict):
            config = _AIConfig(**{k: v for k, v in config.items() if hasattr(_AIConfig, k)})

        super().__init__({"config": config})
        self._cfg: _AIConfig = config
        self._http = requests.Session()
        self._http.headers.update(
            {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "NeuralJustice/1.0",
            }
        )

        # OAuth token cache (None = not yet obtained)
        self._token: _OAuthToken | None = None

        # Validate configuration early
        self._validate_config()

        self._log(logging.INFO, "QuickML provider initialised")

    # ── Public API ─────────────────────────────────────────────────────────

    def chat(self, messages: list[dict[str, str]], **kwargs: t.Any) -> dict[str, t.Any]:
        """Send a chat request to the QuickML GLM endpoint.

        Parameters
        ----------
        messages : list[dict[str, str]]
            ChatML-style messages, *e.g.*
            ``[{"role": "user", "content": "Hello"}]``.
        **kwargs
            Optional overrides: ``temperature``, ``max_tokens``, ``top_p``,
            ``instructions``, ``chat_template_kwargs``.

        Returns
        -------
        dict
            At minimum ``{"content": "..."}`` plus ``"finish_reason"``.
        """
        url = self._cfg.quickml_endpoint_url
        if not url:
            raise QuickMLError("QUICKML_ENDPOINT_URL is not configured")

        # Build payload — only include parameters the model supports
        payload: dict[str, t.Any] = {
            "messages": messages,
        }

        # Optional parameters (the crm-di-glm47b model supports these)
        temp = kwargs.get("temperature")
        if temp is not None:
            payload["temperature"] = float(temp)

        max_tok = kwargs.get("max_tokens")
        if max_tok is not None:
            payload["max_tokens"] = int(max_tok)

        top_p = kwargs.get("top_p")
        if top_p is not None:
            payload["top_p"] = float(top_p)

        instructions = kwargs.get("instructions")
        if instructions:
            payload["instructions"] = str(instructions)

        # chat_template_kwargs: the GLM model supports Jinja-style templates
        chat_template = kwargs.get("chat_template_kwargs")
        if chat_template:
            payload["chat_template_kwargs"] = chat_template

        # Do not send 'stream' — we want a synchronous response
        # Do not send 'tools' / 'tool_choice' unless the deployment supports it
        # (the crm-di-glm47b model does NOT have tool-calling; omit it)

        headers = self._build_headers()

        # Retry loop for transient failures + token expiry
        last_error: Exception | None = None
        max_retries = self._cfg.max_retries

        for attempt in range(1, max_retries + 2):  # 1 initial + N retries
            try:
                resp = self._http.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=self._cfg.timeout_ms / 1000.0,
                )

                # ── 401 / 403 → token likely expired → refresh and retry ──
                if resp.status_code in (401, 403):
                    self._log(
                        logging.WARNING,
                        "Token rejected (HTTP %d), forcing refresh",
                        resp.status_code,
                    )
                    self._token = None  # invalidate cache
                    headers = self._build_headers(force_refresh=True)
                    if attempt <= max_retries:
                        continue
                    raise QuickMLAuthError(
                        f"QuickML auth failed after {max_retries} retries: "
                        f"HTTP {resp.status_code} — {resp.text[:300]}"
                    )

                # ── 429 → rate-limited → exponential backoff ──────────────
                if resp.status_code == 429:
                    wait = min(2**attempt, 30)
                    self._log(
                        logging.WARNING,
                        "Rate limited, retrying in %ds (attempt %d/%d)",
                        wait,
                        attempt,
                        max_retries,
                    )
                    time.sleep(wait)
                    continue

                # ── 4xx / 5xx (non-auth) ─────────────────────────────────
                if not resp.ok:
                    raise QuickMLRequestError(
                        f"QuickML HTTP {resp.status_code}: {resp.text[:500]}"
                    )

                # ── Success ────────────────────────────────────────────────
                data = resp.json()
                return self._parse_response(data)

            except (requests.ConnectionError, requests.Timeout) as exc:
                last_error = exc
                self._log(
                    logging.WARNING,
                    "Network error (attempt %d/%d): %s",
                    attempt,
                    max_retries,
                    exc,
                )
                if attempt <= max_retries:
                    time.sleep(min(2**attempt, 30))
                    continue
                raise QuickMLError(
                    f"QuickML unreachable after {max_retries} retries: {exc}"
                ) from exc

        # Should not reach here, but belt-and-suspenders
        raise QuickMLError(
            f"QuickML request failed after {max_retries} retries"
        ) from last_error

    def health(self) -> dict[str, t.Any]:
        """Health-check: report whether the token is available."""
        ok = bool(self._cfg.quickml_endpoint_url)
        try:
            self._ensure_token()
        except QuickMLAuthError as exc:
            return {
                "provider": "quickml",
                "status": "unhealthy",
                "error": str(exc),
            }
        return {
            "provider": "quickml",
            "status": "healthy" if ok else "misconfigured",
            "endpoint_configured": ok,
            "token_obtained": self._token is not None,
        }

    def close(self) -> None:
        self._http.close()

    # ── Internal: OAuth token lifecycle ────────────────────────────────────

    def _validate_config(self) -> None:
        """Raise early if essential config is missing."""
        if self._cfg.mock_ai:
            return  # skip validation when mocking

        missing: list[str] = []
        if not self._cfg.quickml_client_id:
            missing.append("QUICKML_CLIENT_ID")
        if not self._cfg.quickml_client_secret:
            missing.append("QUICKML_CLIENT_SECRET")
        if not self._cfg.quickml_endpoint_url:
            missing.append("QUICKML_ENDPOINT_URL")
        if not self._cfg.quickml_endpoint_key:
            missing.append("QUICKML_ENDPOINT_KEY")
        if not self._cfg.catalyst_org_id:
            missing.append("CATALYST_ORG_ID")

        if missing:
            logger.warning(
                "QuickML partially configured — missing: %s. "
                "Provider will fail at runtime until these are set.",
                ", ".join(missing),
            )

    def _ensure_token(self) -> str:
        """Return a valid access token, refreshing if necessary."""
        if self._token is not None and not self._token.expired:
            return self._token.access_token

        return self._refresh_token()

    def _refresh_token(self) -> str:
        """Exchange client credentials for a fresh access token."""
        client_id = self._cfg.quickml_client_id
        client_secret = self._cfg.quickml_client_secret
        token_url = self._cfg.quickml_oauth_url
        scope = self._cfg.quickml_oauth_scope

        if not client_id or not client_secret:
            raise QuickMLAuthError(
                "QUICKML_CLIENT_ID and QUICKML_CLIENT_SECRET must be set"
            )

        self._log(logging.INFO, "Exchanging client credentials for OAuth token")

        try:
            resp = requests.post(
                token_url,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "client_credentials",
                    "scope": scope,
                },
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout=15,
            )
        except requests.RequestException as exc:
            raise QuickMLAuthError(f"OAuth token request failed: {exc}") from exc

        if not resp.ok:
            raise QuickMLAuthError(
                f"OAuth token error (HTTP {resp.status_code}): "
                f"{resp.text[:500]}"
            )

        data = resp.json()
        access_token = data.get("access_token")
        if not access_token:
            raise QuickMLAuthError(
                f"OAuth response missing 'access_token': {data}"
            )

        expires_in = int(data.get("expires_in", 3600))
        self._token = _OAuthToken(
            access_token=access_token,
            expires_at=time.time() + expires_in,
        )

        self._log(
            logging.INFO,
            "OAuth token obtained — expires in %ds (at %.0f)",
            expires_in,
            self._token.expires_at,
        )

        return self._token.access_token

    def _build_headers(
        self, force_refresh: bool = False
    ) -> dict[str, str]:
        """Build the full header set for a QuickML API call."""
        if force_refresh:
            self._token = None

        token = self._ensure_token()

        headers: dict[str, str] = {
            "Authorization": f"Zoho-oauthtoken {token}",
            "CATALYST-ORG": self._cfg.catalyst_org_id,
            "Environment": self._cfg.catalyst_environment,
        }

        if self._cfg.quickml_endpoint_key:
            headers["X-QUICKML-ENDPOINT-KEY"] = self._cfg.quickml_endpoint_key

        return headers

    # ── Response parsing ───────────────────────────────────────────────────

    def _parse_response(self, data: dict[str, t.Any]) -> dict[str, t.Any]:
        """Normalise the QuickML response into a standard dict.

        QuickML / GLM responses have the shape::

            {
              "id": "...",
              "object": "chat.completion",
              "created": 1234567890,
              "model": "crm-di-glm47b_30b_it",
              "choices": [
                {
                  "index": 0,
                  "message": {
                    "role": "assistant",
                    "content": "..."
                  },
                  "finish_reason": "stop"
                }
              ],
              "usage": {
                "prompt_tokens": ...,
                "completion_tokens": ...,
                "total_tokens": ...
              }
            }
        """
        try:
            choices = data.get("choices", [])
            if not choices:
                # Some deployments return the content directly
                content = data.get("content") or data.get("response") or str(data)
                return {"content": content, "finish_reason": "stop"}

            choice = choices[0]
            message = choice.get("message", {})
            content = message.get("content", "")
            finish_reason = choice.get("finish_reason", "stop")

            result: dict[str, t.Any] = {
                "content": content,
                "finish_reason": finish_reason,
            }

            usage = data.get("usage")
            if usage:
                result["usage"] = usage

            return result

        except (KeyError, TypeError, IndexError) as exc:
            self._log(logging.ERROR, "Failed to parse QuickML response: %s", exc)
            raise QuickMLRequestError(
                f"Unexpected response format: {str(data)[:300]}"
            ) from exc

    def _log(
        self, level: int, msg: str, *args: t.Any, **extra: t.Any
    ) -> None:
        extra.setdefault("provider", "quickml")
        logger.log(level, msg, *args, extra=extra)
