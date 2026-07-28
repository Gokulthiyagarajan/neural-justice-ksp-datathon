"""Tests for query executor."""
import pytest
from backend.api.copilot.executor import execute_intent_query
from backend.api.copilot.models import Intent, QueryEvidence
from backend.api.copilot.datastore import SqliteDataStore
from backend.api.copilot.auth import JurisdictionScope


@pytest.fixture
def seed_db():
    """Create an in-memory DB with test data."""
    ds = SqliteDataStore(":memory:")
    ds.execute("""CREATE TABLE cases (
        id INTEGER PRIMARY KEY, crime_no TEXT, crime_type TEXT, crime_head TEXT,
        status TEXT, station TEXT, district TEXT, occurrence_date TEXT,
        filing_date TEXT, brief_facts TEXT, latitude REAL, longitude REAL,
        accused_names TEXT, complainant_name TEXT, victim_name TEXT,
        num_accused INTEGER, is_solved INTEGER, created_at TEXT
    )""")
    ds.execute("""CREATE TABLE stations (
        id INTEGER PRIMARY KEY, name TEXT, code TEXT, district TEXT,
        division TEXT, type TEXT, officer_count INTEGER, active_cases INTEGER,
        solved_rate REAL, lat REAL, lng REAL, phone TEXT, incharge TEXT,
        status TEXT, created_at TEXT
    )""")
    ds.execute("""CREATE TABLE criminal_profiles (
        id INTEGER PRIMARY KEY, name TEXT, age INTEGER, gender TEXT,
        case_count INTEGER, status TEXT, risk_score REAL, last_active TEXT,
        modus_operandi TEXT, aliases TEXT, phone TEXT, address TEXT,
        photo_url TEXT, district TEXT, crime_types TEXT, created_at TEXT
    )""")
    ds.execute("INSERT INTO cases (crime_no, crime_type, status, station, district, occurrence_date, accused_names, victim_name) VALUES ('KL-2024-001', 'Theft', 'under_investigation', 'Koramangala PS', 'Bengaluru Urban', '2024-06-15', '[\"John Doe\"]', 'Jane Smith')")
    ds.execute("INSERT INTO cases (crime_no, crime_type, status, station, district, occurrence_date, accused_names, victim_name) VALUES ('KL-2024-002', 'Assault', 'closed', 'HSR Layout PS', 'Bengaluru Urban', '2024-07-01', '[\"Bob\"]', 'Alice')")
    ds.execute("INSERT INTO stations (name, code, district, active_cases, solved_rate, status) VALUES ('Koramangala PS', 'PS001', 'Bengaluru Urban', 5, 65.0, 'active')")
    ds.execute("INSERT INTO criminal_profiles (name, age, gender, case_count, risk_score, district) VALUES ('John Doe', 35, 'Male', 3, 0.85, 'Bengaluru Urban')")
    return ds


def test_crime_trends_query(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    evidence, rows = execute_intent_query(Intent.CRIME_TRENDS, {}, scope, seed_db)
    assert len(evidence) >= 1
    assert evidence[0].source_table == "cases"
    assert len(rows) >= 2


def test_hotspot_query(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    evidence, rows = execute_intent_query(Intent.HOTSPOT, {}, scope, seed_db)
    assert len(evidence) >= 1
    assert evidence[0].source_table == "cases"


def test_suspect_lookup(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    evidence, rows = execute_intent_query(Intent.SUSPECT_LOOKUP, {"name": "John"}, scope, seed_db)
    assert len(rows) >= 1
    assert "John" in rows[0]["name"]


def test_risk_score(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    evidence, rows = execute_intent_query(Intent.RISK_SCORE, {"name": "John Doe"}, scope, seed_db)
    assert len(rows) == 1
    assert rows[0]["risk_score"] == 0.85


def test_station_performance(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    evidence, rows = execute_intent_query(Intent.STATION_PERFORMANCE, {"station": "Koramangala"}, scope, seed_db)
    assert len(rows) >= 1


def test_officer_assignment(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    evidence, rows = execute_intent_query(Intent.OFFICER_ASSIGNMENT, {"case_id": "KL-2024-001"}, scope, seed_db)
    assert len(evidence) >= 1


def test_jurisdiction_scoping(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    seed_db.execute("INSERT INTO cases (crime_no, crime_type, status, station, district) VALUES ('MH-2024-001', 'Theft', 'open', 'Mumbai PS', 'Mumbai')")
    evidence, rows = execute_intent_query(Intent.CRIME_TRENDS, {}, scope, seed_db)
    # GROUP BY crime_type: Theft (2 rows) + Assault (1 row) = 2 groups
    assert len(rows) == 2
    # Verify Theft count includes the Mumbai case
    theft_row = next(r for r in rows if r["crime_type"] == "Theft")
    assert theft_row["count"] == 2


def test_general_query_returns_empty_evidence(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    evidence, rows = execute_intent_query(Intent.GENERAL_QUERY, {}, scope, seed_db)
    assert evidence == []
    assert rows == []
