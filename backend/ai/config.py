"""AI / LLM configuration for Neural Justice.

All settings are read **once** on import from environment variables, then
frozen.  The ``AIConfig`` dataclass is consumed by the orchestrator and
passed down to each provider.
"""

from __future__ import annotations

import os
import typing as t
from dataclasses import dataclass, field


@dataclass
class AIConfig:
    """Immutable configuration snapshot for the AI layer."""

    # ── Provider selection ────────────────────────────────────────────────
    # Reads env var PROVIDER (not AI_PROVIDER). This matches the .env convention.
    provider: str = field(
        default_factory=lambda: os.environ.get("PROVIDER", "quickml")
    )
    mock_ai: bool = field(
        default_factory=lambda: os.environ.get("MOCK_AI", "false").lower()
        in ("1", "true", "yes")
    )

    # ── Timeouts / retries ────────────────────────────────────────────────
    timeout_ms: int = field(
        default_factory=lambda: int(os.environ.get("AI_TIMEOUT_MS", "60000"))
    )
    max_retries: int = field(
        default_factory=lambda: int(os.environ.get("AI_MAX_RETRIES", "3"))
    )
    enable_cache: bool = field(
        default_factory=lambda: os.environ.get("AI_ENABLE_CACHE", "true").lower()
        in ("1", "true", "yes")
    )

    # ── Ollama (local fallback) ───────────────────────────────────────────
    ollama_base_url: str = field(
        default_factory=lambda: os.environ.get(
            "OLLAMA_BASE_URL", "http://localhost:11434"
        )
    )
    ollama_model: str = field(
        default_factory=lambda: os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
    )

    # ── QuickML (Zoho Catalyst — preferred) ──────────────────────────────

    # Project and deployment identifiers
    catalyst_project_id: str = field(
        default_factory=lambda: os.environ.get("CATALYST_PROJECT_ID", "")
    )

    # Endpoint URL (supplied by Catalyst Console QuickML → Generative AI → LLM Serving)
    quickml_endpoint_url: str = field(
        default_factory=lambda: os.environ.get(
            "QUICKML_ENDPOINT",
            "",  # Must be set explicitly — see .env
        )
    )

    # Model ID (from Console)
    quickml_model_id: str = field(
        default_factory=lambda: os.environ.get("QUICKML_MODEL_ID", "")
    )

    # Organisation ID (from Console → Organisation Profile)
    # The .env uses QUICKML_ORG_ID (not CATALYST_ORG_ID)
    catalyst_org_id: str = field(
        default_factory=lambda: os.environ.get("QUICKML_ORG_ID", "")
    )

    # Endpoint key (unique per deployment — from QuickML → View API)
    quickml_endpoint_key: str = field(
        default_factory=lambda: os.environ.get("QUICKML_ENDPOINT_KEY", "")
    )

    # ── Zoho OAuth2 (client credentials) ──────────────────────────────────
    quickml_client_id: str = field(
        default_factory=lambda: os.environ.get("QUICKML_CLIENT_ID", "")
    )
    quickml_client_secret: str = field(
        default_factory=lambda: os.environ.get("QUICKML_CLIENT_SECRET", "")
    )

    # OAuth scope (default is correct for inference)
    quickml_oauth_scope: str = field(
        default_factory=lambda: os.environ.get(
            "QUICKML_OAUTH_SCOPE", "QuickML.deployment.READ"
        )
    )

    # Zoho accounts domain (region-specific)
    #   India:     accounts.zoho.in
    #   US:        accounts.zoho.com
    #   EU:        accounts.zoho.eu
    #   Australia: accounts.zoho.com.au
    #   Japan:     accounts.zoho.jp
    #   China:     accounts.zoho.com.cn
    #   Saudi:     accounts.zoho.sa
    quickml_oauth_url: str = field(
        default_factory=lambda: os.environ.get(
            "QUICKML_OAUTH_URL",
            "https://accounts.zoho.in/oauth/v2/token",
        )
    )

    # ── Environment for QuickML headers ──────────────────────────────────
    environment: str = field(
        default_factory=lambda: os.environ.get("ENVIRONMENT", "development")
    )
    catalyst_environment: str = field(
        default_factory=lambda: os.environ.get(
            "CATALYST_ENVIRONMENT", "Development"
        ).capitalize()
    )

    # ── Validated on construction ─────────────────────────────────────────
    def __post_init__(self) -> None:
        if self.mock_ai:
            import warnings

            warnings.warn(
                "MOCK_AI=true — all AI responses will be simulated. "
                "Set MOCK_AI=false and configure a real provider for production."
            )
