"""Tests for the AI Copilot service layer.

Covers:
- Role-based strategy selection
- System prompt generation per role/mode
- Context builder output
- CopilotService.chat() enrichment
- Response parsing (cards, charts, confidence)
- Session management
"""

from __future__ import annotations

import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.ai.copilot import (
    CopilotService,
    RoleStrategy,
    build_system_prompt,
    get_strategy,
)
from backend.ai.copilot.context import ContextBuilder


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def copilot_service():
    """Create a CopilotService instance with mocked orchestrator."""
    svc = CopilotService()
    # Replace the real orchestrator with a mock
    mock = MagicMock()
    mock.chat.return_value = MagicMock(
        content=(
            "Based on current data, crime in Bengaluru has increased by 15%. "
            "[CARD:todays-firs] [CARD:crime-index] "
            "[CHART:bar:{\"labels\":[\"Jan\",\"Feb\"],\"data\":[45,67]}] "
            "[CONF:85]"
        ),
        finish_reason="stop",
        latency_ms=450.0,
        provider="mock",
        usage={"prompt_tokens": 200, "completion_tokens": 100, "total_tokens": 300},
    )
    svc._orchestrator = mock
    return svc


# ── Strategy Tests ────────────────────────────────────────────────────────────


class TestRoleStrategy:
    """Verify role-based strategy selection and scope."""

    def test_cp_strategy(self):
        """CP should get state-wide scope and all modes."""
        strategy = get_strategy("CP")
        assert strategy.role_key == "CP"
        assert strategy.scope == "state-wide"
        assert "network_analysis" in strategy.available_modes
        assert "forecast" in strategy.available_modes

    def test_sp_strategy(self):
        """SP should get district scope and broad modes."""
        strategy = get_strategy("SP")
        assert strategy.scope == "district"
        assert "statistical" in strategy.available_modes
        assert "nl2sql" in strategy.available_modes

    def test_pi_strategy(self):
        """PI should get station scope and investigative modes."""
        strategy = get_strategy("PI")
        assert strategy.scope == "station / circle"
        assert "case_analysis" in strategy.available_modes
        assert "fir_search" in strategy.available_modes

    def test_psi_strategy(self):
        """PSI should get basic modes with detailed verbosity."""
        strategy = get_strategy("PSI")
        assert strategy.scope == "station"
        assert strategy.verbosity == "detailed"

    def test_pc_strategy(self):
        """PC should get limited modes."""
        strategy = get_strategy("PC")
        assert strategy.scope == "assigned cases only"
        assert "fir_search" in strategy.available_modes
        assert "case_analysis" not in strategy.available_modes

    def test_unknown_role_defaults(self):
        """Unknown roles should fall back to default strategy."""
        strategy = get_strategy("UNKNOWN_ROLE")
        assert strategy.scope == "unknown"
        assert strategy.verbosity == "concise"


class TestSystemPrompt:
    """Verify system prompt generation."""

    def test_cp_prompt_contains_executive_context(self):
        prompt = build_system_prompt("CP")
        assert "Commissioner of Police" in prompt
        assert "state-wide" in prompt.lower() or "State-wide" in prompt

    def test_sp_prompt_contains_district_context(self):
        prompt = build_system_prompt("SP")
        assert "Superintendent" in prompt
        assert "district" in prompt.lower()

    def test_pi_prompt_contains_investigation_context(self):
        prompt = build_system_prompt("PI")
        assert "Inspector" in prompt

    def test_mode_specific_instructions(self):
        """Mode-specific instructions should be included when mode is provided."""
        prompt = build_system_prompt("SP", mode="fir_search")
        assert "FIR Search" in prompt
        assert "crime_no" in prompt

        prompt2 = build_system_prompt("SP", mode="network_analysis")
        assert "Network Analysis" in prompt2

    def test_kannada_language_instruction(self):
        """Kannada language flag should add language instruction."""
        prompt = build_system_prompt("SP", lang="kn")
        assert "Kannada" in prompt or "ಕನ್ನಡ" in prompt

    def test_default_prompt_for_unknown_role(self):
        prompt = build_system_prompt("UNKNOWN")
        assert "Karnataka State Police" in prompt
        assert "[CARD:" in prompt


# ── Context Tests ─────────────────────────────────────────────────────────────


class TestContextBuilder:
    """Verify context building and content."""

    def setup_method(self):
        self.builder = ContextBuilder()

    def test_build_context_contains_dashboard_metrics(self):
        context = self.builder.build_context()
        assert "Key Metrics" in context
        assert "FIRs" in context
        assert "Active investigations" in context

    def test_build_context_contains_alerts(self):
        context = self.builder.build_context(include_alerts=True)
        assert "Active Early Warnings" in context
        assert "CRITICAL" in context

    def test_build_context_skips_alerts_when_disabled(self):
        context = self.builder.build_context(include_alerts=False)
        assert "Active Early Warnings" not in context

    def test_build_context_contains_hotspots(self):
        context = self.builder.build_context(include_hotspots=True)
        assert "Current Crime Hotspots" in context

    def test_build_context_contains_time_info(self):
        context = self.builder.build_context()
        assert "Temporal Context" in context
        assert "Current date" in context

    def test_build_case_context(self):
        context = self.builder.build_case_context("FIR-2026-104")
        assert "FIR-2026-104" in context
        assert "Case Context" in context

    def test_build_query_context_fir_keyword(self):
        context = self.builder.build_query_context("Show me FIRs from last week")
        assert "FIR database access" in context

    def test_build_query_context_trend_keyword(self):
        context = self.builder.build_query_context("What are the crime trends?")
        assert "Crime analytics" in context

    def test_build_query_context_hotspot_keyword(self):
        context = self.builder.build_query_context("Show crime hotspots on map")
        assert "Geospatial data" in context

    def test_build_query_context_general_fallback(self):
        context = self.builder.build_query_context("Hello, what can you do?")
        assert "General crime intelligence data" in context


# ── Service Tests ─────────────────────────────────────────────────────────────


class TestCopilotService:
    """Verify copilot service chat, sessions, and response parsing."""

    def test_chat_returns_content(self, copilot_service):
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Show me crime stats"}],
            user_role="SP",
        )
        assert result.content is not None
        assert len(result.content) > 0
        assert result.finish_reason == "stop"

    def test_chat_includes_provider_info(self, copilot_service):
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Hello"}],
            user_role="IO",
        )
        assert result.provider == "mock"
        assert result.latency_ms >= 0

    def test_chat_extracts_cited_cards(self, copilot_service):
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Show me dashboard data"}],
            user_role="CP",
        )
        assert len(result.cited_cards) > 0
        assert "todays-firs" in result.cited_cards
        assert "crime-index" in result.cited_cards

    def test_chat_extracts_chart_data(self, copilot_service):
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Show trends"}],
            user_role="SP",
        )
        assert result.chart_data is not None
        assert result.chart_data["type"] == "bar"
        assert "labels" in result.chart_data
        assert "data" in result.chart_data

    def test_chat_extracts_confidence(self, copilot_service):
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Analyze this"}],
            user_role="PI",
        )
        assert result.confidence is not None
        assert isinstance(result.confidence, float)
        assert 0 <= result.confidence <= 100

    def test_chat_cleans_markers_from_content(self, copilot_service):
        """Content should not contain [CARD], [CHART], or [CONF] markers."""
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Show me data"}],
            user_role="SP",
        )
        assert "[CARD:" not in result.content
        assert "[CHART:" not in result.content
        assert "[CONF:" not in result.content

    def test_chat_creates_session(self, copilot_service):
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Hello copilot"}],
            user_role="IO",
        )
        assert result.session_id is not None
        assert result.session_id.startswith("copilot-")

    def test_chat_reuses_session(self, copilot_service):
        result1 = copilot_service.chat(
            messages=[{"role": "user", "content": "First message"}],
            user_role="IO",
            session_id="test-session-1",
        )
        result2 = copilot_service.chat(
            messages=[{"role": "user", "content": "Second message"}],
            user_role="IO",
            session_id="test-session-1",
        )
        assert result1.session_id == result2.session_id

    def test_get_session(self, copilot_service):
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Test"}],
            user_role="SP",
        )
        session = copilot_service.get_session(result.session_id)
        assert session is not None
        assert session.role_key == "SP"

    def test_list_sessions(self, copilot_service):
        copilot_service.chat(
            messages=[{"role": "user", "content": "Session 1"}],
            user_role="CP",
        )
        copilot_service.chat(
            messages=[{"role": "user", "content": "Session 2"}],
            user_role="SP",
        )
        sessions = copilot_service.list_sessions(limit=5)
        assert len(sessions) >= 2

    def test_delete_session(self, copilot_service):
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Delete me"}],
            user_role="IO",
            session_id="delete-test",
        )
        assert copilot_service.get_session(result.session_id) is not None
        assert copilot_service.delete_session(result.session_id) is True
        assert copilot_service.get_session(result.session_id) is None

    def test_delete_nonexistent_session_returns_false(self, copilot_service):
        assert copilot_service.delete_session("nonexistent") is False

    def test_health_check(self, copilot_service):
        health = copilot_service.health()
        assert health["service"] == "copilot"
        assert health["status"] == "healthy"
        assert "active_sessions" in health
        assert "provider" in health

    def test_chat_handles_empty_response(self, copilot_service):
        """Should handle graceful degradation when orchestrator errors."""
        copilot_service._orchestrator.chat.side_effect = Exception("Provider down")
        result = copilot_service.chat(
            messages=[{"role": "user", "content": "Hello"}],
            user_role="IO",
        )
        assert "currently unavailable" in result.content
        assert result.finish_reason == "error"

    def test_session_eviction(self):
        """Over 1000 sessions should trigger eviction of oldest 20%."""
        svc = CopilotService()
        for i in range(1100):
            svc.chat(
                messages=[{"role": "user", "content": f"Message {i}"}],
                user_role="IO",
                session_id=f"evict-session-{i}",
            )
        # Should have evicted oldest ~200
        assert len(svc._sessions) <= 1000
        # Newer sessions should survive
        assert svc.get_session("evict-session-1099") is not None


# ── Response Parsing Tests ────────────────────────────────────────────────────


class TestResponseParsing:
    """Verify raw response parsing utilities."""

    def test_extract_cards_empty(self):
        """No card markers should return empty list."""
        assert CopilotService._extract_cards("No cards here") == []

    def test_extract_cards_single(self):
        assert CopilotService._extract_cards("[CARD:todays-firs]") == ["todays-firs"]

    def test_extract_cards_multiple(self):
        text = "Data [CARD:crime-index] and [CARD:ai-alerts]"
        cards = CopilotService._extract_cards(text)
        assert len(cards) == 2
        assert "crime-index" in cards
        assert "ai-alerts" in cards

    def test_extract_chart_valid(self):
        text = '[CHART:bar:{"labels":["A","B"],"data":[1,2]}]'
        chart = CopilotService._extract_chart(text)
        assert chart is not None
        assert chart["type"] == "bar"
        assert chart["labels"] == ["A", "B"]
        assert chart["data"] == [1, 2]

    def test_extract_chart_missing(self):
        assert CopilotService._extract_chart("No chart here") is None

    def test_extract_confidence_valid(self):
        assert CopilotService._extract_confidence("[CONF:85]") == 85.0

    def test_extract_confidence_missing(self):
        assert CopilotService._extract_confidence("No confidence") is None

    def test_strip_markers_removes_all(self):
        text = "Start [CARD:test] middle [CHART:bar:{}] end [CONF:90]"
        cleaned = CopilotService._strip_markers(text)
        assert "Start" in cleaned
        assert "middle" in cleaned
        assert "end" in cleaned
        assert "[CARD:" not in cleaned
        assert "[CHART:" not in cleaned
        assert "[CONF:" not in cleaned
