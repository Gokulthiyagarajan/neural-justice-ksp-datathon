"""Tests for Pydantic models."""
import pytest
from backend.api.copilot.models import (
    ChatRequest, ChatResponse, Intent, QueryEvidence, SessionInfo
)


def test_chat_request_minimal():
    req = ChatRequest(message="Show crime trends")
    assert req.message == "Show crime trends"
    assert req.session_id is None
    assert req.language == "en"


def test_chat_request_with_session():
    req = ChatRequest(message="Tell me more", session_id="abc-123", language="kn")
    assert req.session_id == "abc-123"
    assert req.language == "kn"


def test_intent_enum_values():
    valid = {"risk_score", "crime_trends", "hotspot", "suspect_lookup",
             "victim_stats", "station_performance", "officer_assignment", "general_query"}
    assert {i.value for i in Intent} == valid


def test_query_evidence():
    qe = QueryEvidence(source_table="cases", filters_applied={"district": "Bengaluru"}, row_count=42)
    assert qe.row_count == 42


def test_chat_response():
    resp = ChatResponse(
        session_id="s1",
        reply_text="There were 42 cases in Bengaluru",
        reply_language="en",
        intent_detected=Intent.CRIME_TRENDS,
        classification_confidence=0.95,
        classification_tier="rule_based",
        query_evidence=[],
        clarification_needed=False,
        clarification_prompt=None,
    )
    assert resp.intent_detected == Intent.CRIME_TRENDS
    assert resp.classification_tier == "rule_based"


def test_session_info():
    si = SessionInfo(session_id="s1", created_at="2026-01-01T00:00:00", message_count=5)
    assert si.message_count == 5
