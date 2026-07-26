"""AI provider registry — load the right provider by name."""

from __future__ import annotations

import typing as t

from .base import BaseAIProvider
from .quickml import QuickMLProvider

# Registry mapping provider name → provider class
AVAILABLE_PROVIDERS: dict[str, type[BaseAIProvider]] = {
    "quickml": QuickMLProvider,
}


def get_provider_class(name: str) -> type[BaseAIProvider] | None:
    """Return the provider class for *name*, or ``None`` if unknown."""
    return AVAILABLE_PROVIDERS.get(name.lower())


def list_providers() -> list[str]:
    """Return the list of registered provider names."""
    return list(AVAILABLE_PROVIDERS.keys())


__all__ = [
    "AVAILABLE_PROVIDERS",
    "BaseAIProvider",
    "QuickMLProvider",
    "get_provider_class",
    "list_providers",
]
