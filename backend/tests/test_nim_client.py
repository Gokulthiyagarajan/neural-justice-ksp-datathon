"""Tests for the NIM API client wrapper."""

from __future__ import annotations

import json
import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock

from backend.pipeline.nim_client import NimClient, NimError, NimResponse, Models


class TestNimClientInit:
    """Test client initialization."""

    def test_init_with_explicit_key(self):
        client = NimClient(api_key="test-key-123")
        assert client.api_key == "test-key-123"

    def test_init_with_env_var(self, monkeypatch):
        monkeypatch.setenv("NIM_API_KEY", "env-key-456")
        client = NimClient()
        assert client.api_key == "env-key-456"

    def test_init_missing_key_logs_warning(self, monkeypatch):
        monkeypatch.delenv("NIM_API_KEY", raising=False)
        client = NimClient()
        assert client.api_key == ""

    def test_default_timeout(self):
        client = NimClient(api_key="test")
        assert client.timeout == 45.0

    def test_custom_timeout(self):
        client = NimClient(api_key="test", timeout=30.0)
        assert client.timeout == 30.0

    def test_default_max_retries(self):
        client = NimClient(api_key="test")
        assert client.max_retries == 3


class TestModels:
    """Test model constants."""

    def test_generation_model(self):
        assert Models.GENERATION == "openai/gpt-oss-120b"

    def test_critical_review_model(self):
        assert Models.CRITICAL_REVIEW == "nvidia/nemotron-3-ultra-550b-a55b"

    def test_deep_reasoning_model(self):
        assert Models.DEEP_REASONING == "deepseek-ai/deepseek-r1"

    def test_consistency_model(self):
        assert Models.CONSISTENCY == "nvidia/nemotron-mini-4b-instruct"


class TestNimResponse:
    """Test NimResponse dataclass."""

    def test_usage_property(self):
        resp = NimResponse(
            content="test",
            model="test-model",
            stage_name="test",
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150,
        )
        assert resp.usage == {
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150,
        }


class TestNimClientChat:
    """Test the chat method with mocked HTTP."""

    def _mock_response(self, status_code: int, body: dict | str = None, headers: dict = None):
        """Create a mock httpx.Response."""
        mock = MagicMock()
        mock.status_code = status_code
        mock.headers = headers or {}
        if body is not None:
            mock.json.return_value = body if isinstance(body, dict) else json.loads(body)
            mock.text = json.dumps(body) if isinstance(body, dict) else str(body)
        else:
            mock.text = ""
        return mock

    @pytest.mark.asyncio
    async def test_successful_chat(self):
        client = NimClient(api_key="test-key")

        response_body = {
            "id": "cmpl-test",
            "model": "openai/gpt-oss-120b",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": '{"claims": []}'},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        }

        mock_resp = self._mock_response(200, response_body)

        with patch("backend.pipeline.nim_client.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await client.chat(
                model=Models.GENERATION,
                messages=[{"role": "user", "content": "Hello"}],
                stage_name="test_generation",
            )

            assert isinstance(result, NimResponse)
            assert result.content == '{"claims": []}'
            assert result.stage_name == "test_generation"
            assert result.prompt_tokens == 10
            assert result.completion_tokens == 5
            assert result.total_tokens == 15
            assert result.finish_reason == "stop"

    @pytest.mark.asyncio
    async def test_retry_on_429(self):
        client = NimClient(api_key="test-key", max_retries=2)

        rate_limit_resp = self._mock_response(429, headers={"Retry-After": "0.1"})
        success_body = {
            "model": "test",
            "choices": [{"message": {"content": "ok"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        }
        success_resp = self._mock_response(200, success_body)

        with patch("backend.pipeline.nim_client.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=[rate_limit_resp, success_resp])
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await client.chat(
                model=Models.GENERATION,
                messages=[{"role": "user", "content": "test"}],
                stage_name="test_retry",
            )

            assert result.content == "ok"
            assert mock_client.post.call_count == 2

    @pytest.mark.asyncio
    async def test_retry_on_503(self):
        client = NimClient(api_key="test-key", max_retries=2)

        service_unavail = self._mock_response(503, headers={"Retry-After": "0.1"})
        success_body = {
            "model": "test",
            "choices": [{"message": {"content": "ok"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        }
        success_resp = self._mock_response(200, success_body)

        with patch("backend.pipeline.nim_client.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=[service_unavail, success_resp])
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await client.chat(
                model=Models.GENERATION,
                messages=[{"role": "user", "content": "test"}],
                stage_name="test_503",
            )

            assert result.content == "ok"

    @pytest.mark.asyncio
    async def test_raises_on_permanent_failure(self):
        client = NimClient(api_key="test-key", max_retries=1)

        error_resp = self._mock_response(500, body={"error": "internal"})

        with patch("backend.pipeline.nim_client.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=error_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(NimError) as exc_info:
                await client.chat(
                    model=Models.GENERATION,
                    messages=[{"role": "user", "content": "test"}],
                    stage_name="test_fail",
                )

            assert exc_info.value.stage_name == "test_fail"
            assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_raises_on_empty_choices(self):
        client = NimClient(api_key="test-key")

        empty_body = {"model": "test", "choices": [], "usage": {}}
        mock_resp = self._mock_response(200, empty_body)

        with patch("backend.pipeline.nim_client.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(NimError) as exc_info:
                await client.chat(
                    model=Models.GENERATION,
                    messages=[{"role": "user", "content": "test"}],
                    stage_name="test_empty",
                )

            assert "Empty choices" in str(exc_info.value)
