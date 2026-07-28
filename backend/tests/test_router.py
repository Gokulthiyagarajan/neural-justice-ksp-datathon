"""Tests for the copilot router (integration)."""
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from backend.api.copilot.router import router
from backend.api.copilot.datastore import SqliteDataStore, get_datastore, DataStore
from backend.api.copilot.session_store import SessionStore

app = FastAPI()
app.include_router(router, prefix="/api/copilot")

# Build test database
_test_ds = SqliteDataStore(":memory:")
_test_ds.execute("""CREATE TABLE cases (
    id INTEGER PRIMARY KEY, crime_no TEXT, crime_type TEXT, crime_head TEXT,
    status TEXT, station TEXT, district TEXT, occurrence_date TEXT,
    filing_date TEXT, brief_facts TEXT, latitude REAL, longitude REAL,
    accused_names TEXT, complainant_name TEXT, victim_name TEXT,
    num_accused INTEGER, is_solved INTEGER, created_at TEXT
)""")
_test_ds.execute("""CREATE TABLE stations (
    id INTEGER PRIMARY KEY, name TEXT, code TEXT, district TEXT,
    division TEXT, type TEXT, officer_count INTEGER, active_cases INTEGER,
    solved_rate REAL, lat REAL, lng REAL, phone TEXT, incharge TEXT,
    status TEXT, created_at TEXT
)""")
_test_ds.execute("""CREATE TABLE criminal_profiles (
    id INTEGER PRIMARY KEY, name TEXT, age INTEGER, gender TEXT,
    case_count INTEGER, status TEXT, risk_score REAL, last_active TEXT,
    modus_operandi TEXT, aliases TEXT, phone TEXT, address TEXT,
    photo_url TEXT, district TEXT, crime_types TEXT, created_at TEXT
)""")
_test_ds.execute("INSERT INTO cases (crime_no, crime_type, status, station, district) VALUES ('KL-001', 'Theft', 'open', 'Koramangala PS', 'Bengaluru')")
_test_ds.execute("INSERT INTO stations (name, code, district, active_cases, solved_rate, status) VALUES ('Koramangala PS', 'PS001', 'Bengaluru', 5, 65.0, 'active')")
_test_ds.execute("INSERT INTO criminal_profiles (name, age, gender, case_count, risk_score) VALUES ('John Doe', 35, 'Male', 3, 0.85)")

# Init session tables
_ss = SessionStore(_test_ds)
_ss.init_tables()


def _override_ds():
    return _test_ds


app.dependency_overrides[get_datastore] = _override_ds

client = TestClient(app)


def test_chat_crime_trends():
    resp = client.post("/api/copilot/chat", json={"message": "Show crime trends"}, headers={"X-Demo-Session": "true"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent_detected"] == "crime_trends"
    assert "query_evidence" in data
    assert data["session_id"] is not None


def test_chat_hotspot():
    resp = client.post("/api/copilot/chat", json={"message": "Where are the crime hotspots?"}, headers={"X-Demo-Session": "true"})
    assert resp.status_code == 200
    assert resp.json()["intent_detected"] == "hotspot"


def test_chat_general_query():
    resp = client.post("/api/copilot/chat", json={"message": "Tell me about quantum physics"}, headers={"X-Demo-Session": "true"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent_detected"] == "general_query"
    assert data["query_evidence"] == []


def test_chat_requires_auth():
    resp = client.post("/api/copilot/chat", json={"message": "hello"})
    assert resp.status_code == 401


def test_session_persistence():
    resp1 = client.post("/api/copilot/chat", json={"message": "Show crime trends"}, headers={"X-Demo-Session": "true"})
    sid = resp1.json()["session_id"]
    resp2 = client.post("/api/copilot/chat", json={"message": "Tell me more", "session_id": sid}, headers={"X-Demo-Session": "true"})
    assert resp2.json()["session_id"] == sid
    resp3 = client.get(f"/api/copilot/sessions/{sid}", headers={"X-Demo-Session": "true"})
    assert resp3.status_code == 200
    assert resp3.json()["message_count"] >= 2
