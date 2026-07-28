"""Response Cache for Pipeline Results.

Caches pipeline results by hash(query + case_id + mode) with configurable TTL.
Demo-safety measure to avoid redundant LLM calls during presentations.

Default TTL: 10 minutes.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("nj.pipeline.response_cache")


# ── Cache entry ────────────────────────────────────────────────────────────


@dataclass
class CacheEntry:
    """A single cached response."""

    key: str
    result: dict[str, Any]
    created_at: float
    ttl_seconds: float
    hit_count: int = 0

    @property
    def is_expired(self) -> bool:
        return time.time() - self.created_at > self.ttl_seconds

    @property
    def age_seconds(self) -> float:
        return time.time() - self.created_at

    @property
    def remaining_seconds(self) -> float:
        remaining = self.ttl_seconds - self.age_seconds
        return max(0.0, remaining)


# ── Response Cache ─────────────────────────────────────────────────────────


class ResponseCache:
    """In-memory response cache with TTL-based expiration.

    Args:
        ttl_seconds: Time-to-live for cache entries (default 600 = 10 minutes).
        max_entries: Maximum number of entries to store (default 100).
    """

    def __init__(self, ttl_seconds: float = 600.0, max_entries: int = 100):
        self._cache: dict[str, CacheEntry] = {}
        self._ttl = ttl_seconds
        self._max_entries = max_entries

    def _make_key(self, query: str, case_id: str | None, mode: str) -> str:
        """Generate cache key from query + case_id + mode."""
        raw = f"{query.strip().lower()}|{case_id or ''}|{mode}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def get(self, query: str, case_id: str | None = None, mode: str = "fast") -> dict[str, Any] | None:
        """Look up a cached result.

        Returns the cached result dict if found and not expired, else None.
        """
        key = self._make_key(query, case_id, mode)

        entry = self._cache.get(key)
        if entry is None:
            logger.debug("[CACHE] Miss: %s", key)
            return None

        if entry.is_expired:
            logger.debug("[CACHE] Expired: %s (age=%.0fs)", key, entry.age_seconds)
            del self._cache[key]
            return None

        entry.hit_count += 1
        logger.debug(
            "[CACHE] Hit: %s (age=%.0fs, remaining=%.0fs, hits=%d)",
            key, entry.age_seconds, entry.remaining_seconds, entry.hit_count,
        )
        return entry.result

    def set(self, query: str, case_id: str | None, mode: str, result: dict[str, Any]) -> None:
        """Store a result in the cache."""
        key = self._make_key(query, case_id, mode)

        # Evict oldest if at capacity
        if len(self._cache) >= self._max_entries and key not in self._cache:
            self._evict_oldest()

        self._cache[key] = CacheEntry(
            key=key,
            result=result,
            created_at=time.time(),
            ttl_seconds=self._ttl,
        )
        logger.debug("[CACHE] Stored: %s (ttl=%.0fs)", key, self._ttl)

    def invalidate(self, query: str, case_id: str | None = None, mode: str = "fast") -> bool:
        """Remove a specific entry from the cache.

        Returns True if an entry was removed, False otherwise.
        """
        key = self._make_key(query, case_id, mode)
        if key in self._cache:
            del self._cache[key]
            logger.debug("[CACHE] Invalidated: %s", key)
            return True
        return False

    def clear(self) -> int:
        """Clear all cache entries.

        Returns the number of entries removed.
        """
        count = len(self._cache)
        self._cache.clear()
        logger.info("[CACHE] Cleared %d entries", count)
        return count

    def cleanup(self) -> int:
        """Remove all expired entries.

        Returns the number of entries removed.
        """
        expired_keys = [
            key for key, entry in self._cache.items()
            if entry.is_expired
        ]
        for key in expired_keys:
            del self._cache[key]

        if expired_keys:
            logger.debug("[CACHE] Cleaned up %d expired entries", len(expired_keys))
        return len(expired_keys)

    def stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        entries = list(self._cache.values())
        total_hits = sum(e.hit_count for e in entries)
        return {
            "total_entries": len(entries),
            "max_entries": self._max_entries,
            "ttl_seconds": self._ttl,
            "total_hits": total_hits,
            "expired_entries": sum(1 for e in entries if e.is_expired),
        }

    def _evict_oldest(self) -> None:
        """Evict the oldest entry (by creation time)."""
        if not self._cache:
            return

        oldest_key = min(self._cache, key=lambda k: self._cache[k].created_at)
        del self._cache[oldest_key]
        logger.debug("[CACHE] Evicted oldest: %s", oldest_key)


# ── Singleton ──────────────────────────────────────────────────────────────

_cache: ResponseCache | None = None


def get_response_cache() -> ResponseCache:
    """Get the app-wide response cache instance."""
    global _cache
    if _cache is None:
        _cache = ResponseCache()
        logger.info("ResponseCache initialized (TTL=600s, max=100)")
    return _cache
