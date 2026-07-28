"""Pydantic schemas for the Drishti Copilot API."""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class Intent(str, Enum):
    RISK_SCORE = "risk_score"
    CRIME_TRENDS = "crime_trends"
    HOTSPOT = "hotspot"
    SUSPECT_LOOKUP = "suspect_lookup"
    VICTIM_STATS = "victim_stats"
    STATION_PERFORMANCE = "station_performance"
    OFFICER_ASSIGNMENT = "officer_assignment"
    GENERAL_QUERY = "general_query"
    GENERAL_CHAT = "general_chat"


class QueryEvidence(BaseModel):
    source_table: str
    filters_applied: dict[str, str] = Field(default_factory=dict)
    row_count: int = 0


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: str = "en"  # "en" or "kn"


class ChatResponse(BaseModel):
    session_id: str
    reply_text: str
    reply_language: str = "en"
    intent_detected: Intent
    classification_confidence: float = 0.0
    classification_tier: str = "rule_based"  # "rule_based" | "quickml_fallback"
    query_evidence: list[QueryEvidence] = Field(default_factory=list)
    clarification_needed: bool = False
    clarification_prompt: Optional[str] = None


class SessionInfo(BaseModel):
    session_id: str
    created_at: str
    message_count: int = 0
