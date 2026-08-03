"""Tests for response generator."""
import pytest
from backend.api.copilot.response import generate_response
from backend.api.copilot.models import Intent, QueryEvidence


def test_crime_trends_response():
    rows = [{"crime_type": "Theft", "count": 42}, {"crime_type": "Assault", "count": 15}]
    evidence = [QueryEvidence(source_table="cases", row_count=2)]
    result = generate_response(Intent.CRIME_TRENDS, rows, evidence, "en", [])
    assert "Theft" in result
    assert "42" in result
    assert "Assault" in result


def test_hotspot_response():
    rows = [{"station": "Koramangala PS", "district": "Bengaluru", "case_count": 28}]
    evidence = [QueryEvidence(source_table="cases", row_count=1)]
    result = generate_response(Intent.HOTSPOT, rows, evidence, "en", [])
    assert "Koramangala" in result
    assert "28" in result


def test_suspect_response():
    rows = [{"name": "John Doe", "age": 35, "case_count": 3}]
    evidence = [QueryEvidence(source_table="criminal_profiles", row_count=1)]
    result = generate_response(Intent.SUSPECT_LOOKUP, rows, evidence, "en", [])
    assert "John Doe" in result


def test_risk_score_refused():
    """The RISK_SCORE_DENIED intent must NOT surface any numeric risk value."""
    rows = [{"name": "John Doe", "risk_score": 0.85, "modus_operandi": "Repeat offender", "case_count": 3}]
    evidence = [QueryEvidence(source_table="criminal_profiles", row_count=1)]
    result = generate_response(Intent.RISK_SCORE_DENIED, rows, evidence, "en", [])
    assert "risk_score" not in result.lower().replace(" ", "")
    assert "individual risk scoring" in result.lower()
    # No fabricated numbers should leak from the refusal path.
    assert "85" not in result
    assert "0.85" not in result


def test_general_query_response():
    evidence = []
    result = generate_response(Intent.GENERAL_QUERY, [], evidence, "en", [])
    assert "cannot answer" in result.lower() or "not something" in result.lower() or "data" in result.lower()


def test_empty_results():
    evidence = [QueryEvidence(source_table="cases", row_count=0)]
    result = generate_response(Intent.CRIME_TRENDS, [], evidence, "en", [])
    assert "no" in result.lower() or "found" in result.lower() or "empty" in result.lower()


def test_station_performance_response():
    rows = [{"name": "Koramangala PS", "active_cases": 5, "solved_rate": 65.0}]
    evidence = [QueryEvidence(source_table="stations", row_count=1)]
    result = generate_response(Intent.STATION_PERFORMANCE, rows, evidence, "en", [])
    assert "Koramangala" in result
