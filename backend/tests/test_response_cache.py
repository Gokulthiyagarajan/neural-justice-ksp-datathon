"""Tests for response_cache module."""

import time
import pytest
from unittest.mock import patch

from backend.pipeline.response_cache import ResponseCache, CacheEntry, get_response_cache


class TestCacheEntry:
    def test_not_expired(self):
        entry = CacheEntry(key="k", result={}, created_at=time.time(), ttl_seconds=600)
        assert entry.is_expired is False

    def test_expired(self):
        entry = CacheEntry(key="k", result={}, created_at=time.time() - 700, ttl_seconds=600)
        assert entry.is_expired is True

    def test_age(self):
        entry = CacheEntry(key="k", result={}, created_at=time.time() - 100, ttl_seconds=600)
        assert 99 < entry.age_seconds < 101

    def test_remaining(self):
        entry = CacheEntry(key="k", result={}, created_at=time.time() - 100, ttl_seconds=600)
        assert 499 < entry.remaining_seconds < 501

    def test_remaining_expired(self):
        entry = CacheEntry(key="k", result={}, created_at=time.time() - 700, ttl_seconds=600)
        assert entry.remaining_seconds == 0.0


class TestResponseCache:
    def test_miss(self):
        cache = ResponseCache(ttl_seconds=600)
        assert cache.get("query", None, "fast") is None

    def test_hit(self):
        cache = ResponseCache(ttl_seconds=600)
        cache.set("query", None, "fast", {"report_id": "RPT-001"})
        result = cache.get("query", None, "fast")
        assert result is not None
        assert result["report_id"] == "RPT-001"

    def test_expired_miss(self):
        cache = ResponseCache(ttl_seconds=0.01)  # Very short TTL
        cache.set("query", None, "fast", {"data": "value"})
        time.sleep(0.02)
        assert cache.get("query", None, "fast") is None

    def test_different_keys(self):
        cache = ResponseCache(ttl_seconds=600)
        cache.set("query1", None, "fast", {"data": "1"})
        cache.set("query2", None, "fast", {"data": "2"})
        assert cache.get("query1", None, "fast")["data"] == "1"
        assert cache.get("query2", None, "fast")["data"] == "2"

    def test_different_modes(self):
        cache = ResponseCache(ttl_seconds=600)
        cache.set("query", None, "fast", {"data": "fast"})
        cache.set("query", None, "deep", {"data": "deep"})
        assert cache.get("query", None, "fast")["data"] == "fast"
        assert cache.get("query", None, "deep")["data"] == "deep"

    def test_different_case_ids(self):
        cache = ResponseCache(ttl_seconds=600)
        cache.set("query", "CASE-1", "fast", {"data": "case1"})
        cache.set("query", "CASE-2", "fast", {"data": "case2"})
        assert cache.get("query", "CASE-1", "fast")["data"] == "case1"
        assert cache.get("query", "CASE-2", "fast")["data"] == "case2"

    def test_invalidate(self):
        cache = ResponseCache(ttl_seconds=600)
        cache.set("query", None, "fast", {"data": "value"})
        assert cache.invalidate("query", None, "fast") is True
        assert cache.get("query", None, "fast") is None

    def test_invalidate_nonexistent(self):
        cache = ResponseCache(ttl_seconds=600)
        assert cache.invalidate("nonexistent", None, "fast") is False

    def test_clear(self):
        cache = ResponseCache(ttl_seconds=600)
        cache.set("q1", None, "fast", {"data": "1"})
        cache.set("q2", None, "fast", {"data": "2"})
        count = cache.clear()
        assert count == 2
        assert cache.get("q1", None, "fast") is None

    def test_cleanup(self):
        cache = ResponseCache(ttl_seconds=0.01)
        cache.set("q1", None, "fast", {"data": "1"})
        cache.set("q2", None, "fast", {"data": "2"})
        time.sleep(0.02)
        removed = cache.cleanup()
        assert removed == 2

    def test_max_entries_eviction(self):
        cache = ResponseCache(ttl_seconds=600, max_entries=3)
        cache.set("q1", None, "fast", {"data": "1"})
        cache.set("q2", None, "fast", {"data": "2"})
        cache.set("q3", None, "fast", {"data": "3"})
        cache.set("q4", None, "fast", {"data": "4"})  # Should evict q1
        assert cache.get("q1", None, "fast") is None
        assert cache.get("q4", None, "fast") is not None

    def test_hit_count(self):
        cache = ResponseCache(ttl_seconds=600)
        cache.set("query", None, "fast", {"data": "value"})
        cache.get("query", None, "fast")
        cache.get("query", None, "fast")
        stats = cache.stats()
        assert stats["total_hits"] == 2

    def test_stats(self):
        cache = ResponseCache(ttl_seconds=600, max_entries=50)
        cache.set("q1", None, "fast", {"data": "1"})
        stats = cache.stats()
        assert stats["total_entries"] == 1
        assert stats["max_entries"] == 50
        assert stats["ttl_seconds"] == 600


class TestGetResponseCache:
    def test_singleton(self):
        cache1 = get_response_cache()
        cache2 = get_response_cache()
        assert cache1 is cache2
