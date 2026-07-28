"""Tests for intent classifier."""
import pytest
from backend.api.copilot.intent import classify_intent, _rule_based_classify
from backend.api.copilot.models import Intent


def test_risk_score_keyword():
    intent, conf, tier, entities = _rule_based_classify("What is the risk score for accused John?")
    assert intent == Intent.RISK_SCORE
    assert conf >= 0.7
    assert tier == "rule_based"


def test_crime_trends_keyword():
    intent, conf, tier, entities = _rule_based_classify("Show me crime trends in Bengaluru")
    assert intent == Intent.CRIME_TRENDS
    assert conf >= 0.7


def test_hotspot_keyword():
    intent, conf, tier, entities = _rule_based_classify("Where are the crime hotspots?")
    assert intent == Intent.HOTSPOT
    assert conf >= 0.7


def test_suspect_lookup_keyword():
    intent, conf, tier, entities = _rule_based_classify("Find suspect John Doe")
    assert intent == Intent.SUSPECT_LOOKUP
    assert conf >= 0.7
    assert entities.get("name") == "John Doe"


def test_victim_stats_keyword():
    intent, conf, tier, entities = _rule_based_classify("Victim demographics in Karnataka")
    assert intent == Intent.VICTIM_STATS
    assert conf >= 0.7


def test_station_performance_keyword():
    intent, conf, tier, entities = _rule_based_classify("How is Station X performing?")
    assert intent == Intent.STATION_PERFORMANCE
    assert conf >= 0.7


def test_officer_assignment_keyword():
    intent, conf, tier, entities = _rule_based_classify("Who is assigned to case 12345?")
    assert intent == Intent.OFFICER_ASSIGNMENT
    assert conf >= 0.7


def test_general_query_fallback():
    intent, conf, tier, entities = _rule_based_classify("Tell me about crime in India")
    assert intent == Intent.GENERAL_CHAT


def test_ambiguous_routes_to_general():
    intent, conf, tier, entities = _rule_based_classify("hello")
    assert intent == Intent.GENERAL_CHAT


def test_kannada_keywords():
    intent, conf, tier, entities = _rule_based_classify("ಅಪರಾಧ ಪ್ರವೃತ್ತಿ ತೋರಿಸಿ")
    assert intent == Intent.CRIME_TRENDS
