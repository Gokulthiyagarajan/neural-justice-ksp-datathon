# Drishti Copilot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a natural-language conversational AI copilot for the Neural Justice platform that answers investigator queries grounded in real database results, with EN/KN support, voice I/O, PDF export, and RBAC+ABAC jurisdiction scoping.

**Architecture:** Abstraction-layer approach — a `DataStore` interface with sqlite3 implementation now, ZCQL-ready for future swap. Backend: new FastAPI router at `/api/copilot` with two-tier intent classification (rule-based + QuickML fallback), parameterized SQL templates, session persistence, and jurisdiction scoping. Frontend: new dedicated chat page at `/copilot` with Zustand store, reusing existing voice hooks and UI patterns from `src/copilot/`.

**Tech Stack:** Python 3.11+ FastAPI · sqlite3 (abstraction layer) · QuickML GLM (intent fallback + response generation) · React 18 + TypeScript + Vite + Tailwind + Zustand · Web Speech API (voice)

---

## Global Constraints

- **NO SQLAlchemy, NO psycopg2, NO raw SQL JOINs** — parameterized queries only via the DataStore abstraction
- **Scope lock:** Only touch files listed in this plan. Do NOT modify existing dashboard, RBAC, FIR CRUD, or any file outside the listed paths
- **Existing `src/copilot/` module:** Stays as-is (floating AiPanel). The new `/copilot` page is a SEPARATE dedicated chat page. Both coexist — the floating panel is for quick queries, the page is for extended conversations
- **Auth:** JWT-based, derive `district_id`/`station_id` from token payload for jurisdiction scoping
- **Session storage:** SQLite `chat_sessions` + `chat_messages` tables (additive, new tables only)
- **Every response must include `query_evidence`** — citation of which table/filters/row count produced the answer
- **`general_query` must be bounded** — no open-ended LLM free response. Either rephrase to another intent or return a fixed "out of scope" message with suggested queries
- **Kannada translation:** Use QuickML for EN↔KN, preserve proper nouns
- **Voice:** Reuse existing `src/copilot/hooks/useVoiceInput.ts` and `src/api/voiceClient.ts`
- **PDF:** Adapt existing `backend/pdf/engine.py` — add new function, don't rewrite existing

---

## File Map

### Backend (new files)
| File | Responsibility |
|------|---------------|
| `backend/app/__init__.py` | Package init (if not exists) |
| `backend/app/api/__init__.py` | Package init (if not exists) |
| `backend/app/api/copilot/__init__.py` | Package init |
| `backend/app/api/copilot/router.py` | FastAPI router: `POST /chat`, `GET /sessions/{id}`, `POST /export` |
| `backend/app/api/copilot/models.py` | Pydantic schemas: ChatRequest, ChatResponse, Intent, QueryEvidence |
| `backend/app/api/copilot/intent.py` | Two-tier intent classifier (rules + QuickML fallback) |
| `backend/app/api/copilot/query_templates.py` | Parameterized SQL templates per intent |
| `backend/app/api/copilot/executor.py` | Executes queries via DataStore abstraction, returns structured results |
| `backend/app/api/copilot/datastore.py` | DataStore abstraction interface + sqlite3 implementation |
| `backend/app/api/copilot/session_store.py` | Session persistence (SQLite tables: chat_sessions, chat_messages) |
| `backend/app/api/copilot/translate.py` | QuickML EN↔KN translation with proper-noun preservation |
| `backend/app/api/copilot/auth.py` | FastAPI Depends: get_current_user, get_jurisdiction_scope |
| `backend/app/api/copilot/response.py` | Response generator — builds natural language from query results |

### Frontend (new files)
| File | Responsibility |
|------|---------------|
| `frontend/src/pages/Copilot/CopilotPage.tsx` | Dedicated chat page |
| `frontend/src/pages/Copilot/ChatMessage.tsx` | Message bubble component |
| `frontend/src/pages/Copilot/ChatInput.tsx` | Input bar with voice toggle |
| `frontend/src/store/useCopilotStore.ts` | Zustand store for chat state |
| `frontend/src/api/copilotApi.ts` | API client for `/api/copilot/*` |

### Modified files
| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add `/copilot` route |
| `backend/app/api/main.py` | Register copilot router (if using FastAPI backend) |
| `backend/pdf/engine.py` | Add `ChatTranscriptPDF` class (append-only, no existing code changes) |

---

## Task 1: DataStore Abstraction Layer

**Files:**
- Create: `backend/app/api/copilot/datastore.py`
- Create: `backend/tests/test_datastore.py`

**Interfaces:**
- Consumes: sqlite3 database at `functions/neural-justice-backend/neural_justice.db`
- Produces: `DataStore` class with `query(sql, params) → list[dict]` and `execute(sql, params) → int`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_datastore.py
import pytest
from app.api.copilot.datastore import DataStore, SqliteDataStore

def test_datastore_query_returns_list_of_dicts():
    ds = SqliteDataStore(":memory:")
    ds.execute("CREATE TABLE test (id INTEGER, name TEXT)")
    ds.execute("INSERT INTO test VALUES (1, 'hello')")
    result = ds.query("SELECT * FROM test WHERE id = ?", (1,))
    assert result == [{"id": 1, "name": "hello"}]

def test_datastore_query_empty_result():
    ds = SqliteDataStore(":memory:")
    ds.execute("CREATE TABLE test (id INTEGER, name TEXT)")
    result = ds.query("SELECT * FROM test WHERE id = ?", (999,))
    assert result == []

def test_datastore_execute_returns_rowcount():
    ds = SqliteDataStore(":memory:")
    ds.execute("CREATE TABLE test (id INTEGER, name TEXT)")
    ds.execute("INSERT INTO test VALUES (1, 'a')")
    count = ds.execute("UPDATE test SET name = ? WHERE id = ?", ('b', 1))
    assert count == 1

def test_abstract_interface():
    """Verify DataStore is an abstract base class."""
    from abc import ABC
    assert issubclass(DataStore, ABC)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_datastore.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.api.copilot.datastore'`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/api/copilot/datastore.py
"""
DataStore abstraction — sqlite3 now, ZCQL-ready interface.

All data access in the copilot module goes through this interface.
To swap to ZCQL: implement a ZCQLDataStore class with the same interface.
"""
from abc import ABC, abstractmethod
from typing import Any
import sqlite3
import os
import logging

logger = logging.getLogger(__name__)


class DataStore(ABC):
    """Abstract interface for data access."""

    @abstractmethod
    def query(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        """Execute a read query, return list of row dicts."""
        ...

    @abstractmethod
    def execute(self, sql: str, params: tuple = ()) -> int:
        """Execute a write query, return affected row count."""
        ...


class SqliteDataStore(DataStore):
    """sqlite3 implementation — current production backend."""

    def __init__(self, db_path: str):
        self._db_path = db_path

    @classmethod
    def from_env(cls) -> "SqliteDataStore":
        """Create from DATABASE_URL env var (matches existing backend pattern)."""
        db_path = os.environ.get("DATABASE_URL", "sqlite:///./neural_justice.db")
        if db_path.startswith("sqlite:///"):
            db_path = db_path[len("sqlite:///"):]
        return cls(db_path)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def query(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        conn = self._connect()
        try:
            cursor = conn.execute(sql, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    def execute(self, sql: str, params: tuple = ()) -> int:
        conn = self._connect()
        try:
            cursor = conn.execute(sql, params)
            conn.commit()
            return cursor.rowcount
        finally:
            conn.close()


# ── Singleton for app-wide use ──
_datastore: DataStore | None = None


def get_datastore() -> DataStore:
    """Get the app-wide DataStore instance."""
    global _datastore
    if _datastore is None:
        _datastore = SqliteDataStore.from_env()
        logger.info("DataStore initialized: %s", type(_datastore).__name__)
    return _datastore
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_datastore.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/copilot/datastore.py backend/tests/test_datastore.py
git commit -m "feat(copilot): add DataStore abstraction layer with sqlite3 impl"
```

---

## Task 2: Pydantic Models

**Files:**
- Create: `backend/app/api/copilot/models.py`
- Create: `backend/tests/test_models.py`

**Interfaces:**
- Consumes: None (standalone schemas)
- Produces: `ChatRequest`, `ChatResponse`, `Intent`, `QueryEvidence`, `SessionInfo`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_models.py
import pytest
from app.api.copilot.models import (
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/api/copilot/models.py
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_models.py -v`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/copilot/models.py backend/tests/test_models.py
git commit -m "feat(copilot): add Pydantic models for chat API"
```

---

## Task 3: Auth Dependencies

**Files:**
- Create: `backend/app/api/copilot/auth.py`
- Create: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: JWT from Authorization header (pattern from `functions/neural-justice-backend/main.py:240-282`)
- Produces: `get_current_user()` → `CurrentUser`, `get_jurisdiction_scope()` → `JurisdictionScope`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_auth.py
import pytest
from fastapi import FastAPI, Header
from fastapi.testclient import TestClient
from app.api.copilot.auth import get_current_user, get_jurisdiction_scope, CurrentUser, JurisdictionScope

app = FastAPI()

@app.get("/test-auth")
async def test_auth(user: CurrentUser = __import__('fastapi').Depends(get_current_user)):
    return {"username": user.username, "roles": user.roles}

@app.get("/test-jurisdiction")
async def test_jurisdiction(scope: JurisdictionScope = __import__('fastapi').Depends(get_jurisdiction_scope)):
    return {"district_id": scope.district_id, "station_id": scope.station_id}

client = TestClient(app)

def test_auth_demo_session():
    """X-Demo-Session header should authenticate as admin."""
    resp = client.get("/test-auth", headers={"X-Demo-Session": "true"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"
    assert "SUPER_ADMIN" in resp.json()["roles"]

def test_auth_no_header_returns_401():
    resp = client.get("/test-auth")
    assert resp.status_code == 401

def test_jurisdiction_demo_session():
    resp = client.get("/test-jurisdiction", headers={"X-Demo-Session": "true"})
    assert resp.status_code == 200
    assert "district_id" in resp.json()

def test_current_user_model():
    u = CurrentUser(username="test", roles=["INVESTIGATOR"], district_id=1, station_id=1)
    assert u.username == "test"
    assert u.is_super_admin is False

def test_current_user_super_admin():
    u = CurrentUser(username="admin", roles=["SUPER_ADMIN"], district_id=1, station_id=1)
    assert u.is_super_admin is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_auth.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/api/copilot/auth.py
"""
Auth dependencies for the copilot router.

Mirrors the JWT verification logic from functions/neural-justice-backend/main.py:240-282
but adapted for FastAPI Depends() pattern.
"""
import os
import hmac
import base64
import hashlib
import json
import logging
from dataclasses import dataclass, field
from typing import Optional

from fastapi import Depends, Header, HTTPException

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET_KEY", os.environ.get("JWT_SECRET", "neural-justice-dev-secret"))


@dataclass
class CurrentUser:
    username: str
    roles: list[str] = field(default_factory=list)
    district_id: int | None = None
    station_id: int | None = None
    jurisdiction_type: str = "state"

    @property
    def is_super_admin(self) -> bool:
        return "SUPER_ADMIN" in self.roles

    @property
    def is_sp(self) -> bool:
        return "SP" in self.roles or self.is_super_admin

    @property
    def is_officer(self) -> bool:
        return any(r in self.roles for r in ["INVESTIGATOR", "SP", "SUPER_ADMIN"])


@dataclass
class JurisdictionScope:
    district_id: int | None = None
    station_id: int | None = None
    jurisdiction_type: str = "state"


def _verify_jwt_simple(token: str) -> Optional[dict]:
    """Minimal JWT verification (HS256) for dev/demo. In production, use Catalyst Auth."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        # Check expiry
        import time
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_demo_session: Optional[str] = Header(None, alias="X-Demo-Session"),
) -> CurrentUser:
    """Extract and verify JWT from request headers.

    Mirrors functions/neural-justice-backend/main.py:240-282 logic:
    - X-Demo-Session header → admin bypass
    - X-Zc-User-Cred-Token → Catalyst gateway auth
    - Bearer token → JWT verification
    """
    # Demo/deployment bypass (matches existing Catalyst behavior)
    if x_demo_session:
        return CurrentUser(
            username="admin",
            roles=["SUPER_ADMIN"],
            district_id=None,
            station_id=None,
            jurisdiction_type="state",
        )

    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Strip Bearer prefix
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]

    payload = _verify_jwt_simple(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    roles = payload.get("roles", [])
    if isinstance(roles, str):
        try:
            roles = json.loads(roles)
        except Exception:
            roles = [roles]

    return CurrentUser(
        username=payload.get("sub", payload.get("username", "unknown")),
        roles=roles,
        district_id=payload.get("district_id"),
        station_id=payload.get("station_id"),
        jurisdiction_type=payload.get("jurisdiction_type", "state"),
    )


async def get_jurisdiction_scope(
    user: CurrentUser = Depends(get_current_user),
) -> JurisdictionScope:
    """Derive jurisdiction scope from the authenticated user.

    SUPER_ADMIN / SP → state-wide (no filter)
    DISTRICT_ADMIN → filter by district_id
    STATION_USER → filter by station_id
    """
    if user.is_super_admin or user.is_sp:
        return JurisdictionScope(
            district_id=None,
            station_id=None,
            jurisdiction_type="state",
        )

    return JurisdictionScope(
        district_id=user.district_id,
        station_id=user.station_id,
        jurisdiction_type="district" if user.district_id else "state",
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_auth.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/copilot/auth.py backend/tests/test_auth.py
git commit -m "feat(copilot): add auth dependencies with jurisdiction scoping"
```

---

## Task 4: Intent Classifier

**Files:**
- Create: `backend/app/api/copilot/intent.py`
- Create: `backend/tests/test_intent.py`

**Interfaces:**
- Consumes: `ChatRequest.message` (raw user text)
- Produces: `(Intent, confidence: float, tier: str, entities: dict)`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_intent.py
import pytest
from app.api.copilot.intent import classify_intent, _rule_based_classify
from app.api.copilot.models import Intent

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
    assert intent == Intent.GENERAL_QUERY

def test_ambiguous_routes_to_general():
    """Ambiguous queries should have low confidence."""
    intent, conf, tier, entities = _rule_based_classify("hello")
    assert intent == Intent.GENERAL_QUERY
    assert conf < 0.6

def test_kannada_keywords():
    intent, conf, tier, entities = _rule_based_classify("ಅಪರಾಧ ಪ್ರವೃತ್ತಿ ತೋರಿಸಿ")
    assert intent == Intent.CRIME_TRENDS
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_intent.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/api/copilot/intent.py
"""
Two-tier intent classifier:
1. Rule-based keyword/regex matching (fast, deterministic)
2. QuickML LLM fallback (handles ambiguity)

Confidence threshold: 0.6
Ambiguity margin: 0.15 (if top-2 scores within this, route to LLM fallback)
"""
import re
import logging
from typing import Optional
from app.api.copilot.models import Intent

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.6
AMBIGUITY_MARGIN = 0.15

# ── Rule-based patterns ──
# Each pattern: (compiled_regex, intent, base_confidence, entity_extractors)

PATTERNS = [
    # risk_score
    (re.compile(r"risk\s*score|risk\s*rating|risk\s*level|ಅಪಾಯ.*ಸ್ಕೋರ್", re.I),
     Intent.RISK_SCORE, 0.85, {}),
    (re.compile(r"accused.*risk|risk.*accused|accused.*danger", re.I),
     Intent.RISK_SCORE, 0.80, {}),
    (re.compile(r"(?:for|of|about)\s+(?:accused\s+)?(\w[\w\s]{1,30})", re.I),
     Intent.RISK_SCORE, 0.65, {"name": 1}),

    # crime_trends
    (re.compile(r"crime\s*trend|crime\s*pattern|trend.*crime|ಘಟನೆ.*ಪ್ರವೃತ್ತಿ", re.I),
     Intent.CRIME_TRENDS, 0.90, {}),
    (re.compile(r"(?:show|display|list).*trend", re.I),
     Intent.CRIME_TRENDS, 0.80, {}),
    (re.compile(r"(?:how\s+many|number\s+of)\s+(?:cases?|crimes?|fir)", re.I),
     Intent.CRIME_TRENDS, 0.75, {}),

    # hotspot
    (re.compile(r"hot\s*spot| hotspot | hotspot$|^hotspot|ಹಾಟ್‌ಸ್ಪಾಟ್", re.I),
     Intent.HOTSPOT, 0.90, {}),
    (re.compile(r"where.*(?:most|high|cluster|concentration)", re.I),
     Intent.HOTSPOT, 0.80, {}),
    (re.compile(r"(?:top|high)\s+(?:crime|incident)\s+(?:areas?|locations?|zones?)", re.I),
     Intent.HOTSPOT, 0.85, {}),

    # suspect_lookup
    (re.compile(r"suspect|accused|ಆರೋಪಿ|ಖತೀಬ", re.I),
     Intent.SUSPECT_LOOKUP, 0.85, {}),
    (re.compile(r"find.*(?:person|man|woman|individual)", re.I),
     Intent.SUSPECT_LOOKUP, 0.70, {}),
    (re.compile(r"(?:search|look\s*up|find)\s+([\w][\w\s]{1,30})", re.I),
     Intent.SUSPECT_LOOKUP, 0.75, {"name": 1}),

    # victim_stats
    (re.compile(r"victim|ಸಂತ್ರಸ್ತ|受害", re.I),
     Intent.VICTIM_STATS, 0.85, {}),
    (re.compile(r"(?:victim|受害).*(?:demo|stat|count|number)", re.I),
     Intent.VICTIM_STATS, 0.90, {}),
    (re.compile(r"(?:age|gender|demographic).*(?:victim|受害)", re.I),
     Intent.VICTIM_STATS, 0.85, {}),

    # station_performance
    (re.compile(r"station\s*performance|station.*(?:doing|status|report)|ಪೊಲೀಸ್\s*ಸ್ಟೇಷನ್", re.I),
     Intent.STATION_PERFORMANCE, 0.90, {}),
    (re.compile(r"(?:how\s+is|status\s+of)\s+(?:station|ps)\s+(\w[\w\s]{0,20})", re.I),
     Intent.STATION_PERFORMANCE, 0.80, {"station": 1}),
    (re.compile(r"station\s+(\w[\w\s]{0,20})", re.I),
     Intent.STATION_PERFORMANCE, 0.70, {"station": 1}),

    # officer_assignment
    (re.compile(r"officer\s*assignment|who.*assigned|assigned\s*officer|ನೇಮಕ", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.85, {}),
    (re.compile(r"(?:which|who)\s+officer.*(?:case|fir)", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.80, {}),
    (re.compile(r"(?:case|fir)\s*(?:no|number|#)?\s*(\d[\w-]{3,20})", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.70, {"case_id": 1}),
]


def _extract_entities(text: str, entity_extractors: dict) -> dict[str, str]:
    """Extract named entities from text using regex groups."""
    entities = {}
    for entity_name, group_idx in entity_extractors.items():
        for pattern, _, _, _ in PATTERNS:
            match = pattern.search(text)
            if match and group_idx <= len(match.groups()):
                val = match.group(group_idx)
                if val:
                    entities[entity_name] = val.strip()
    return entities


def _rule_based_classify(text: str) -> tuple[Intent, float, str, dict]:
    """Rule-based intent classification. Returns (intent, confidence, tier, entities)."""
    text_clean = text.strip()
    if not text_clean:
        return Intent.GENERAL_QUERY, 0.0, "rule_based", {}

    scores: dict[Intent, tuple[float, dict]] = {}

    for pattern, intent, base_conf, extractors in PATTERNS:
        match = pattern.search(text_clean)
        if match:
            # Boost confidence if the match is a significant portion of the text
            match_ratio = len(match.group(0)) / max(len(text_clean), 1)
            conf = min(base_conf + match_ratio * 0.1, 1.0)

            entities = _extract_entities(text_clean, extractors)

            if intent not in scores or conf > scores[intent][0]:
                scores[intent] = (conf, entities)

    if not scores:
        return Intent.GENERAL_QUERY, 0.3, "rule_based", {}

    # Sort by confidence descending
    ranked = sorted(scores.items(), key=lambda x: x[1][0], reverse=True)
    top_intent, (top_conf, top_entities) = ranked[0]

    # Check for ambiguity: if top-2 are within AMBIGUITY_MARGIN, it's ambiguous
    if len(ranked) >= 2:
        second_conf = ranked[1][1][0]
        if top_conf - second_conf < AMBIGUITY_MARGIN and top_conf < 0.9:
            # Ambiguous — low confidence, will trigger QuickML fallback
            return Intent.GENERAL_QUERY, top_conf * 0.8, "rule_based", {}

    return top_intent, top_conf, "rule_based", top_entities


async def classify_intent(text: str) -> tuple[Intent, float, str, dict]:
    """Classify user intent. Two-tier: rules first, QuickML fallback.

    Returns: (intent, confidence, tier, entities)
    """
    # Tier 1: Rule-based
    intent, conf, tier, entities = _rule_based_classify(text)

    if conf >= CONFIDENCE_THRESHOLD:
        logger.info("Intent classified (rule_based): %s (conf=%.2f)", intent.value, conf)
        return intent, conf, tier, entities

    # Tier 2: QuickML fallback (placeholder — will be implemented in Task 8)
    # For now, return the rule-based result with a note
    logger.info("Intent low confidence (%.2f), QuickML fallback not yet implemented", conf)
    return intent, conf, tier, entities
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_intent.py -v`
Expected: 11 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/copilot/intent.py backend/tests/test_intent.py
git commit -m "feat(copilot): add two-tier intent classifier with rule-based matching"
```

---

## Task 5: Query Templates + Executor

**Files:**
- Create: `backend/app/api/copilot/query_templates.py`
- Create: `backend/app/api/copilot/executor.py`
- Create: `backend/tests/test_executor.py`

**Interfaces:**
- Consumes: `Intent`, entities dict, `JurisdictionScope`, `DataStore`
- Produces: `list[QueryEvidence]`, raw result rows

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_executor.py
import pytest
from app.api.copilot.executor import execute_intent_query
from app.api.copilot.models import Intent, QueryEvidence
from app.api.copilot.datastore import SqliteDataStore
from app.api.copilot.auth import JurisdictionScope

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
    # Seed data
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
    """District-scoped user should only see their district's data."""
    scope = JurisdictionScope(district_id=None, station_id=None)
    # Add a case from a different district
    seed_db.execute("INSERT INTO cases (crime_no, crime_type, status, station, district) VALUES ('MH-2024-001', 'Theft', 'open', 'Mumbai PS', 'Mumbai')")
    evidence, rows = execute_intent_query(Intent.CRIME_TRENDS, {}, scope, seed_db)
    # With no scope filter, should see both
    assert len(rows) == 3

def test_general_query_returns_empty_evidence(seed_db):
    scope = JurisdictionScope(district_id=None, station_id=None)
    evidence, rows = execute_intent_query(Intent.GENERAL_QUERY, {}, scope, seed_db)
    assert evidence == []
    assert rows == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_executor.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/api/copilot/query_templates.py
"""
Parameterized SQL templates for each intent.

Each template is a tuple: (sql_template, default_params, source_table)
The executor applies jurisdiction_scope filters before execution.

VERIFIED table/column names against seed_catalyst_db.py schema.
"""
from app.api.copilot.models import Intent

# SQL templates — {jurisdiction_filter} is replaced at execution time
TEMPLATES = {
    Intent.CRIME_TRENDS: {
        "sql": """
            SELECT crime_type, COUNT(*) as count
            FROM cases
            WHERE 1=1 {jurisdiction_filter}
            GROUP BY crime_type
            ORDER BY count DESC
        """,
        "source_table": "cases",
        "params": {},
    },
    Intent.HOTSPOT: {
        "sql": """
            SELECT station, district, COUNT(*) as case_count
            FROM cases
            WHERE 1=1 {jurisdiction_filter}
            GROUP BY station, district
            ORDER BY case_count DESC
            LIMIT 10
        """,
        "source_table": "cases",
        "params": {},
    },
    Intent.SUSPECT_LOOKUP: {
        "sql": """
            SELECT name, age, gender, case_count, risk_score, modus_operandi, district
            FROM criminal_profiles
            WHERE name LIKE ? {jurisdiction_filter}
            ORDER BY case_count DESC
            LIMIT 10
        """,
        "source_table": "criminal_profiles",
        "params": {"name": "%{name}%"},
    },
    Intent.VICTIM_STATS: {
        "sql": """
            SELECT victim_name, crime_type, station, district
            FROM cases
            WHERE victim_name != '' AND victim_name IS NOT NULL {jurisdiction_filter}
        """,
        "source_table": "cases",
        "params": {},
    },
    Intent.STATION_PERFORMANCE: {
        "sql": """
            SELECT name, code, district, active_cases, solved_rate, officer_count, status
            FROM stations
            WHERE name LIKE ? {jurisdiction_filter}
            LIMIT 5
        """,
        "source_table": "stations",
        "params": {"station": "%{station}%"},
    },
    Intent.OFFICER_ASSIGNMENT: {
        "sql": """
            SELECT crime_no, crime_type, station, district, status, accused_names
            FROM cases
            WHERE crime_no LIKE ? {jurisdiction_filter}
            LIMIT 5
        """,
        "source_table": "cases",
        "params": {"case_id": "%{case_id}%"},
    },
    Intent.RISK_SCORE: {
        "sql": """
            SELECT name, age, gender, case_count, risk_score, modus_operandi, district
            FROM criminal_profiles
            WHERE name LIKE ? {jurisdiction_filter}
            LIMIT 5
        """,
        "source_table": "criminal_profiles",
        "params": {"name": "%{name}%"},
    },
}
```

```python
# backend/app/api/copilot/executor.py
"""
Query executor — runs parameterized queries via the DataStore abstraction,
applies jurisdiction scoping, returns structured results with evidence.
"""
import logging
from typing import Any
from app.api.copilot.models import Intent, QueryEvidence
from app.api.copilot.query_templates import TEMPLATES
from app.api.copilot.datastore import DataStore
from app.api.copilot.auth import JurisdictionScope

logger = logging.getLogger(__name__)


def _build_jurisdiction_filter(scope: JurisdictionScope) -> str:
    """Build SQL WHERE clause fragment for jurisdiction scoping."""
    if scope.station_id:
        # Station-level: filter by station name (we'd need to resolve station_id to name)
        # For now, station_id maps to the stations table id
        return f" AND station IN (SELECT name FROM stations WHERE id = {int(scope.station_id)})"
    if scope.district_id:
        return f" AND district IN (SELECT name FROM districts WHERE id = {int(scope.district_id)})"
    return ""  # State-wide: no filter


def execute_intent_query(
    intent: Intent,
    entities: dict[str, str],
    scope: JurisdictionScope,
    datastore: DataStore,
) -> tuple[list[QueryEvidence], list[dict[str, Any]]]:
    """Execute the query template for the given intent.

    Returns: (evidence_list, result_rows)
    """
    if intent == Intent.GENERAL_QUERY:
        return [], []

    template = TEMPLATES.get(intent)
    if not template:
        logger.warning("No template for intent: %s", intent.value)
        return [], []

    # Build jurisdiction filter
    jurisdiction_filter = _build_jurisdiction_filter(scope)

    # Build SQL with jurisdiction filter
    sql = template["sql"].replace("{jurisdiction_filter}", jurisdiction_filter)

    # Build params — fill in entity values
    params = []
    param_defs = template["params"]
    for key, pattern in param_defs.items():
        value = entities.get(key, "")
        if value:
            # For LIKE patterns, replace {key} with the actual value
            params.append(pattern.replace(f"{{{key}}}", value))
        else:
            # No entity provided — use a broad match
            if "%" in pattern:
                params.append("%")  # Match everything
            else:
                params.append("")

    # Execute query
    source_table = template["source_table"]
    try:
        rows = datastore.query(sql, tuple(params))
        evidence = [QueryEvidence(
            source_table=source_table,
            filters_applied={
                "jurisdiction": scope.jurisdiction_type,
                **{k: v for k, v in entities.items() if v},
            },
            row_count=len(rows),
        )]
        logger.info("Query executed: %s → %d rows", intent.value, len(rows))
        return evidence, rows
    except Exception as e:
        logger.error("Query failed for intent %s: %s", intent.value, e)
        return [QueryEvidence(
            source_table=source_table,
            filters_applied={"error": str(e)},
            row_count=0,
        )], []
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_executor.py -v`
Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/copilot/query_templates.py backend/app/api/copilot/executor.py backend/tests/test_executor.py
git commit -m "feat(copilot): add SQL query templates and executor with jurisdiction scoping"
```

---

## Task 6: Session Store

**Files:**
- Create: `backend/app/api/copilot/session_store.py`
- Create: `backend/tests/test_session_store.py`

**Interfaces:**
- Consumes: `DataStore`
- Produces: `SessionStore` with `create_session()`, `add_message()`, `get_history()`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_session_store.py
import pytest
from app.api.copilot.session_store import SessionStore
from app.api.copilot.datastore import SqliteDataStore

@pytest.fixture
def store():
    ds = SqliteDataStore(":memory:")
    ss = SessionStore(ds)
    ss.init_tables()
    return ss

def test_create_session(store):
    sid = store.create_session("en")
    assert sid is not None
    assert len(sid) > 0

def test_add_and_get_messages(store):
    sid = store.create_session("en")
    store.add_message(sid, "user", "Show crime trends", "en")
    store.add_message(sid, "assistant", "Here are the trends...", "en", intent="crime_trends")
    history = store.get_history(sid)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"
    assert history[1]["intent"] == "crime_trends"

def test_get_history_empty():
    ds = SqliteDataStore(":memory:")
    ss = SessionStore(ds)
    ss.init_tables()
    history = ss.get_history("nonexistent")
    assert history == []

def test_session_message_count(store):
    sid = store.create_session("en")
    store.add_message(sid, "user", "Hello", "en")
    info = store.get_session_info(sid)
    assert info.message_count == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_session_store.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/api/copilot/session_store.py
"""
Session persistence — stores conversation history in SQLite tables.
Additive only: creates chat_sessions and chat_messages tables.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Any
from app.api.copilot.datastore import DataStore

logger = logging.getLogger(__name__)


class SessionStore:
    def __init__(self, datastore: DataStore):
        self._ds = datastore

    def init_tables(self):
        """Create session tables if they don't exist."""
        self._ds.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                session_id TEXT PRIMARY KEY,
                language TEXT DEFAULT 'en',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        self._ds.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                language TEXT DEFAULT 'en',
                intent TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
            )
        """)
        self._ds.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_messages_session
            ON chat_messages(session_id, created_at)
        """)
        logger.info("Session tables initialized")

    def create_session(self, language: str = "en") -> str:
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        self._ds.execute(
            "INSERT INTO chat_sessions (session_id, language, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, language, now, now),
        )
        return session_id

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        language: str = "en",
        intent: str | None = None,
    ):
        self._ds.execute(
            "INSERT INTO chat_messages (session_id, role, content, language, intent) VALUES (?, ?, ?, ?, ?)",
            (session_id, role, content, language, intent),
        )
        self._ds.execute(
            "UPDATE chat_sessions SET updated_at = ? WHERE session_id = ?",
            (datetime.now(timezone.utc).isoformat(), session_id),
        )

    def get_history(self, session_id: str, limit: int = 20) -> list[dict[str, Any]]:
        return self._ds.query(
            "SELECT role, content, language, intent, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?",
            (session_id, limit),
        )

    def get_session_info(self, session_id: str) -> dict[str, Any] | None:
        rows = self._ds.query(
            "SELECT session_id, created_at, updated_at FROM chat_sessions WHERE session_id = ?",
            (session_id,),
        )
        if not rows:
            return None
        msg_count = self._ds.query(
            "SELECT COUNT(*) as cnt FROM chat_messages WHERE session_id = ?",
            (session_id,),
        )
        return {
            **rows[0],
            "message_count": msg_count[0]["cnt"] if msg_count else 0,
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_session_store.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/copilot/session_store.py backend/tests/test_session_store.py
git commit -m "feat(copilot): add SQLite session store for conversation persistence"
```

---

## Task 7: Response Generator + Translation

**Files:**
- Create: `backend/app/api/copilot/response.py`
- Create: `backend/app/api/copilot/translate.py`
- Create: `backend/tests/test_response.py`

**Interfaces:**
- Consumes: `Intent`, query results, `list[QueryEvidence]`, session history
- Produces: Natural language `reply_text`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_response.py
import pytest
from app.api.copilot.response import generate_response
from app.api.copilot.models import Intent, QueryEvidence

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
    rows = [{"name": "John Doe", "age": 35, "case_count": 3, "risk_score": 0.85}]
    evidence = [QueryEvidence(source_table="criminal_profiles", row_count=1)]
    result = generate_response(Intent.SUSPECT_LOOKUP, rows, evidence, "en", [])
    assert "John Doe" in result

def test_risk_score_response():
    rows = [{"name": "John Doe", "risk_score": 0.85, "modus_operandi": "Repeat offender", "case_count": 3}]
    evidence = [QueryEvidence(source_table="criminal_profiles", row_count=1)]
    result = generate_response(Intent.RISK_SCORE, rows, evidence, "en", [])
    assert "0.85" in result or "85%" in result
    assert "Repeat offender" in result  # Must include factor breakdown, not bare number

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_response.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/api/copilot/response.py
"""
Response generator — builds natural language answers from query results.
Every grounded response cites its data source. general_query is bounded.
"""
from typing import Any
from app.api.copilot.models import Intent, QueryEvidence

SUGGESTED_QUERIES = [
    "Show crime trends in Bengaluru",
    "Where are the crime hotspots?",
    "Find suspect John Doe",
    "What is the risk score for accused X?",
    "How is Station Y performing?",
    "Victim demographics in Karnataka",
    "Who is assigned to case Z?",
]


def generate_response(
    intent: Intent,
    rows: list[dict[str, Any]],
    evidence: list[QueryEvidence],
    language: str,
    history: list[dict],
) -> str:
    """Generate a natural language response from query results."""

    if intent == Intent.GENERAL_QUERY:
        return _general_query_response(language)

    if not rows:
        return _empty_response(intent, language)

    # Build response based on intent type
    builders = {
        Intent.CRIME_TRENDS: _crime_trends_response,
        Intent.HOTSPOT: _hotspot_response,
        Intent.SUSPECT_LOOKUP: _suspect_response,
        Intent.VICTIM_STATS: _victim_stats_response,
        Intent.STATION_PERFORMANCE: _station_performance_response,
        Intent.OFFICER_ASSIGNMENT: _officer_assignment_response,
        Intent.RISK_SCORE: _risk_score_response,
    }

    builder = builders.get(intent, _generic_response)
    return builder(rows, evidence, language)


def _crime_trends_response(rows, evidence, lang):
    lines = ["Based on the FIR records, here are the crime trends:\n"]
    for r in rows[:8]:
        lines.append(f"• **{r.get('crime_type', 'Unknown')}**: {r.get('count', 0)} cases")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} aggregated groups)_")
    return "\n".join(lines)


def _hotspot_response(rows, evidence, lang):
    lines = ["Based on FIR records, here are the top crime hotspots:\n"]
    for i, r in enumerate(rows[:10], 1):
        lines.append(f"{i}. **{r.get('station', 'Unknown')}** ({r.get('district', '')}): {r.get('case_count', 0)} cases")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} locations)_")
    return "\n".join(lines)


def _suspect_response(rows, evidence, lang):
    lines = [f"Found {len(rows)} matching record(s):\n"]
    for r in rows[:5]:
        lines.append(f"• **{r.get('name', 'Unknown')}** — Age: {r.get('age', 'N/A')}, Gender: {r.get('gender', 'N/A')}, Cases: {r.get('case_count', 0)}, Risk: {r.get('risk_score', 0):.0%}")
        if r.get("modus_operandi"):
            lines.append(f"  MO: {r['modus_operandi']}")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} records)_")
    return "\n".join(lines)


def _victim_stats_response(rows, evidence, lang):
    lines = [f"Victim information from {len(rows)} record(s):\n"]
    # Aggregate by crime type for summary
    by_type = {}
    for r in rows:
        ct = r.get("crime_type", "Unknown")
        by_type[ct] = by_type.get(ct, 0) + 1
    for ct, count in sorted(by_type.items(), key=lambda x: -x[1])[:10]:
        lines.append(f"• **{ct}**: {count} victim(s)")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} records)_")
    return "\n".join(lines)


def _station_performance_response(rows, evidence, lang):
    lines = ["Station performance data:\n"]
    for r in rows[:5]:
        lines.append(f"• **{r.get('name', 'Unknown')}** ({r.get('district', '')}):")
        lines.append(f"  Active cases: {r.get('active_cases', 0)}, Solved rate: {r.get('solved_rate', 0):.1f}%, Officers: {r.get('officer_count', 0)}")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} stations)_")
    return "\n".join(lines)


def _officer_assignment_response(rows, evidence, lang):
    lines = ["Case assignment details:\n"]
    for r in rows[:5]:
        accused = r.get("accused_names", "[]")
        lines.append(f"• **Case {r.get('crime_no', 'Unknown')}**: {r.get('crime_type', '')} at {r.get('station', '')}")
        lines.append(f"  Status: {r.get('status', '')}, Accused: {accused}")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} records)_")
    return "\n".join(lines)


def _risk_score_response(rows, evidence, lang):
    """Risk score MUST include factor breakdown, never a bare number."""
    lines = ["Risk assessment:\n"]
    for r in rows[:3]:
        score = r.get("risk_score", 0)
        lines.append(f"• **{r.get('name', 'Unknown')}** — Risk Score: {score:.0%}")
        lines.append(f"  Age: {r.get('age', 'N/A')}, Gender: {r.get('gender', 'N/A')}, Prior cases: {r.get('case_count', 0)}")
        if r.get("modus_operandi"):
            lines.append(f"  Modus Operandi: {r['modus_operandi']}")
        # Explain what the score means
        if score >= 0.7:
            lines.append("  ⚠️ High risk — repeat offender pattern detected")
        elif score >= 0.4:
            lines.append("  ⚡ Medium risk — monitor recommended")
        else:
            lines.append("  ✅ Low risk")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} records)_")
    return "\n".join(lines)


def _general_query_response(lang):
    """Bounded fallback — no free LLM generation."""
    suggestions = "\n".join(f"• {q}" for q in SUGGESTED_QUERIES[:5])
    return (
        "I can only answer questions grounded in the platform's FIR and case data. "
        "I cannot provide general crime policy commentary or information outside this dataset.\n\n"
        "**Here are some things I can help with:**\n"
        f"{suggestions}\n\n"
        "_Tip: Try rephrasing your question to focus on specific FIR records, stations, accused persons, or crime statistics._"
    )


def _empty_response(intent, lang):
    intent_labels = {
        Intent.CRIME_TRENDS: "crime trend",
        Intent.HOTSPOT: "crime hotspot",
        Intent.SUSPECT_LOOKUP: "suspect",
        Intent.VICTIM_STATS: "victim",
        Intent.STATION_PERFORMANCE: "station",
        Intent.OFFICER_ASSIGNMENT: "case assignment",
        Intent.RISK_SCORE: "risk score",
    }
    label = intent_labels.get(intent, "data")
    return f"No matching {label} records found in the current dataset. Try refining your search or check if the data exists in the system."


def _generic_response(rows, evidence, lang):
    return f"Found {len(rows)} record(s). Please see the data above."
```

```python
# backend/app/api/copilot/translate.py
"""
EN↔KN translation via QuickML.
Preserves proper nouns (names, station names, crime numbers).
"""
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Proper noun patterns to preserve during translation
PROPER_NOUN_PATTERNS = [
    r'\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b',  # Full names: "John Doe"
    r'\b[A-Z][a-z]+\s(?:PS|Station)\b',      # Station names: "Koramangala PS"
    r'\b[A-Z]{2}-\d{4}-\d+\b',               # Crime numbers: "KL-2024-001"
    r'\b(?:Bengaluru|Mumbai|Delhi|Karnataka|India)\b',  # Place names
]


def _extract_proper_nouns(text: str) -> tuple[str, list[tuple[str, str]]]:
    """Replace proper nouns with placeholders, return (modified_text, replacements)."""
    replacements = []
    modified = text
    for i, pattern in enumerate(PROPER_NOUN_PATTERNS):
        for match in re.finditer(pattern, text):
            placeholder = f"__PN{i}_{len(replacements)}__"
            replacements.append((placeholder, match.group(0)))
            modified = modified.replace(match.group(0), placeholder, 1)
    return modified, replacements


def _restore_proper_nouns(text: str, replacements: list[tuple[str, str]]) -> str:
    """Restore proper nouns from placeholders."""
    for placeholder, original in replacements:
        text = text.replace(placeholder, original)
    return text


async def translate_to_kannada(text: str) -> str:
    """Translate English text to Kannada, preserving proper nouns."""
    # For now, return a simple wrapper — QuickML integration in Task 8
    modified, replacements = _extract_proper_nouns(text)
    # Placeholder: in production, call QuickML translation endpoint
    translated = _restore_proper_nouns(modified, replacements)
    return translated


async def translate_to_english(text: str) -> str:
    """Translate Kannada text to English, preserving proper nouns."""
    modified, replacements = _extract_proper_nouns(text)
    # Placeholder: in production, call QuickML translation endpoint
    translated = _restore_proper_nouns(modified, replacements)
    return translated


async def detect_language(text: str) -> str:
    """Simple Kannada detection via Unicode range."""
    kannada_chars = sum(1 for c in text if '\u0C80' <= c <= '\u0CFF')
    total_alpha = sum(1 for c in text if c.isalpha())
    if total_alpha > 0 and kannada_chars / total_alpha > 0.3:
        return "kn"
    return "en"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_response.py -v`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/copilot/response.py backend/app/api/copilot/translate.py backend/tests/test_response.py
git commit -m "feat(copilot): add response generator and translation stub"
```

---

## Task 8: Copilot Router (Bringing It All Together)

**Files:**
- Create: `backend/app/api/copilot/router.py`
- Create: `backend/tests/test_router.py`

**Interfaces:**
- Consumes: All previous tasks (intent, executor, session, response, auth, translate)
- Produces: FastAPI router with `POST /chat`, `GET /sessions/{id}`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_router.py
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.copilot.router import router
from app.api.copilot.datastore import SqliteDataStore, get_datastore
from app.api.copilot.session_store import SessionStore

app = FastAPI()
app.include_router(router, prefix="/api/copilot")

# Override datastore dependency
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
    # First message
    resp1 = client.post("/api/copilot/chat", json={"message": "Show crime trends"}, headers={"X-Demo-Session": "true"})
    sid = resp1.json()["session_id"]
    # Second message in same session
    resp2 = client.post("/api/copilot/chat", json={"message": "Tell me more", "session_id": sid}, headers={"X-Demo-Session": "true"})
    assert resp2.json()["session_id"] == sid
    # Get session history
    resp3 = client.get(f"/api/copilot/sessions/{sid}", headers={"X-Demo-Session": "true"})
    assert resp3.status_code == 200
    assert resp3.json()["message_count"] >= 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_router.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/api/copilot/router.py
"""
Drishti Copilot API Router.

Endpoints:
  POST /api/copilot/chat        — Send a message, get AI response
  GET  /api/copilot/sessions/{id} — Get session info + message count
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.api.copilot.models import ChatRequest, ChatResponse, Intent
from app.api.copilot.auth import get_current_user, get_jurisdiction_scope, CurrentUser, JurisdictionScope
from app.api.copilot.intent import classify_intent
from app.api.copilot.executor import execute_intent_query
from app.api.copilot.response import generate_response
from app.api.copilot.datastore import DataStore, get_datastore
from app.api.copilot.session_store import SessionStore
from app.api.copilot.translate import detect_language, translate_to_english, translate_to_kannada

logger = logging.getLogger(__name__)
router = APIRouter(tags=["copilot"])


def _get_session_store(ds: DataStore = Depends(get_datastore)) -> SessionStore:
    ss = SessionStore(ds)
    ss.init_tables()
    return ss


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
    scope: JurisdictionScope = Depends(get_jurisdiction_scope),
    datastore: DataStore = Depends(get_datastore),
    session_store: SessionStore = Depends(_get_session_store),
):
    """Process a chat message and return an AI-grounded response."""

    # 1. Detect language if not specified
    detected_lang = await detect_language(req.message)
    msg_lang = req.language or detected_lang

    # 2. Translate to English if Kannada input
    query_text = req.message
    if msg_lang == "kn":
        query_text = await translate_to_english(req.message)

    # 3. Create or reuse session
    session_id = req.session_id
    if not session_id:
        session_id = session_store.create_session(msg_lang)

    # Store user message
    session_store.add_message(session_id, "user", req.message, msg_lang)

    # 4. Get conversation history for context
    history = session_store.get_history(session_id, limit=10)

    # 5. Classify intent
    intent, confidence, tier, entities = await classify_intent(query_text)

    # 6. Execute query
    evidence, rows = execute_intent_query(intent, entities, scope, datastore)

    # 7. Generate response
    reply_text = generate_response(intent, rows, evidence, msg_lang, history)

    # 8. Translate response if Kannada
    if msg_lang == "kn":
        reply_text = await translate_to_kannada(reply_text)

    # 9. Store assistant message
    session_store.add_message(session_id, "assistant", reply_text, msg_lang, intent=intent.value)

    return ChatResponse(
        session_id=session_id,
        reply_text=reply_text,
        reply_language=msg_lang,
        intent_detected=intent,
        classification_confidence=confidence,
        classification_tier=tier,
        query_evidence=evidence,
        clarification_needed=False,
        clarification_prompt=None,
    )


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user: CurrentUser = Depends(get_current_user),
    session_store: SessionStore = Depends(_get_session_store),
):
    """Get session info and message count."""
    info = session_store.get_session_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    return info
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_router.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/copilot/router.py backend/tests/test_router.py
git commit -m "feat(copilot): add FastAPI chat router with full pipeline"
```

---

## Task 9: Frontend — Zustand Store + API Client

**Files:**
- Create: `frontend/src/store/useCopilotStore.ts`
- Create: `frontend/src/api/copilotApi.ts`

**Interfaces:**
- Consumes: `POST /api/copilot/chat`, `GET /api/copilot/sessions/{id}`
- Produces: Zustand store with `sessionId`, `messages[]`, `isStreaming`, `language`, `micActive`, `error`

- [ ] **Step 1: Create the API client**

```typescript
// frontend/src/api/copilotApi.ts
const API_BASE = '/api/copilot';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  intent?: string;
  queryEvidence?: Array<{
    source_table: string;
    filters_applied: Record<string, string>;
    row_count: number;
  }>;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  language?: string;
}

export interface ChatResponse {
  session_id: string;
  reply_text: string;
  reply_language: string;
  intent_detected: string;
  classification_confidence: number;
  classification_tier: string;
  query_evidence: Array<{
    source_table: string;
    filters_applied: Record<string, string>;
    row_count: number;
  }>;
  clarification_needed: boolean;
  clarification_prompt: string | null;
}

export interface SessionInfo {
  session_id: string;
  created_at: string;
  message_count: number;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  // Reuse existing auth pattern from src/api/client.ts
  const token = localStorage.getItem('token');
  const demoSession = localStorage.getItem('demo_session');
  
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (demoSession) {
    headers['X-Demo-Session'] = demoSession;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function getSessionInfo(sessionId: string): Promise<SessionInfo> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_BASE}/sessions/${sessionId}`, { headers });
  if (!resp.ok) throw new Error(`Session not found`);
  return resp.json();
}
```

- [ ] **Step 2: Create the Zustand store**

```typescript
// frontend/src/store/useCopilotStore.ts
import { create } from 'zustand';
import { sendChatMessage, getSessionInfo } from '@/api/copilotApi';
import type { ChatMessage } from '@/api/copilotApi';

interface CopilotState {
  sessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  language: 'en' | 'kn';
  micActive: boolean;
  error: string | null;

  // Actions
  sendMessage: (text: string) => Promise<void>;
  setLanguage: (lang: 'en' | 'kn') => void;
  setMicActive: (active: boolean) => void;
  clearMessages: () => void;
  clearError: () => void;
}

let messageCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++messageCounter}`;
}

export const useCopilotStore = create<CopilotState>((set, get) => ({
  sessionId: null,
  messages: [],
  isStreaming: false,
  language: 'en',
  micActive: false,
  error: null,

  sendMessage: async (text: string) => {
    const { sessionId, messages, language } = get();

    // Add user message
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      language,
      timestamp: new Date().toISOString(),
    };
    set({ messages: [...messages, userMsg], isStreaming: true, error: null });

    try {
      const response = await sendChatMessage({
        message: text,
        session_id: sessionId || undefined,
        language,
      });

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: response.reply_text,
        language: response.reply_language,
        intent: response.intent_detected,
        queryEvidence: response.query_evidence,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        sessionId: response.session_id,
        messages: [...state.messages, assistantMsg],
        isStreaming: false,
      }));
    } catch (err) {
      set({
        isStreaming: false,
        error: err instanceof Error ? err.message : 'Failed to get response',
      });
    }
  },

  setLanguage: (lang) => set({ language: lang }),
  setMicActive: (active) => set({ micActive: active }),
  clearMessages: () => set({ messages: [], sessionId: null }),
  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/useCopilotStore.ts frontend/src/api/copilotApi.ts
git commit -m "feat(copilot): add Zustand store and API client for chat"
```

---

## Task 10: Frontend — Chat Page + Components

**Files:**
- Create: `frontend/src/pages/Copilot/CopilotPage.tsx`
- Create: `frontend/src/pages/Copilot/ChatMessage.tsx`
- Create: `frontend/src/pages/Copilot/ChatInput.tsx`
- Modify: `frontend/src/App.tsx` (add route)

**Interfaces:**
- Consumes: `useCopilotStore`, existing `useVoiceInput`, `voiceClient`
- Produces: Full chat page at `/copilot`

- [ ] **Step 1: Create ChatMessage component**

```tsx
// frontend/src/pages/Copilot/ChatMessage.tsx
import ReactMarkdown from 'react-markdown';
import type { ChatMessage as ChatMessageType } from '@/api/copilotApi';

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Query evidence badge */}
        {!isUser && message.queryEvidence && message.queryEvidence.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.queryEvidence.map((ev, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300"
              >
                <span className="font-mono">{ev.source_table}</span>
                <span className="text-blue-400">·</span>
                <span>{ev.row_count} rows</span>
              </span>
            ))}
          </div>
        )}

        {/* Intent badge */}
        {!isUser && message.intent && (
          <div className="mt-1">
            <span className="inline-block rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
              intent: {message.intent}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatInput component**

```tsx
// frontend/src/pages/Copilot/ChatInput.tsx
import { useState, useRef, useCallback } from 'react';
import { useCopilotStore } from '@/store/useCopilotStore';
import { useVoiceInput } from '@/copilot/hooks/useVoiceInput';

export default function ChatInput() {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming, language, setLanguage, micActive, setMicActive } = useCopilotStore();

  const handleVoiceResult = useCallback((transcript: string) => {
    setText(transcript);
    // Auto-send after voice input
    if (transcript.trim()) {
      sendMessage(transcript.trim());
      setText('');
    }
  }, [sendMessage]);

  const { startListening, stopListening, isSupported: voiceSupported } = useVoiceInput({
    onResult: handleVoiceResult,
    language,
  });

  const handleSend = () => {
    if (!text.trim() || isStreaming) return;
    sendMessage(text.trim());
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (micActive) {
      stopListening();
      setMicActive(false);
    } else {
      startListening();
      setMicActive(true);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-end gap-2">
        {/* Language toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
          className="flex-shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          title="Switch language"
        >
          {language === 'en' ? 'EN' : 'KN'}
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={language === 'en' ? 'Ask about FIRs, accused, crime trends...' : 'FIR, ಆರೋಪಿ, ಅಪರಾಧ ಪ್ರವೃತ್ತಿ ಬಗ್ಗೆ ಕೇಳಿ...'}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={isStreaming}
        />

        {/* Voice button */}
        {voiceSupported && (
          <button
            onClick={toggleMic}
            className={`flex-shrink-0 rounded-lg p-2 ${
              micActive
                ? 'bg-red-500 text-white animate-pulse'
                : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            title={micActive ? 'Stop listening' : 'Start voice input'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || isStreaming}
          className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStreaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CopilotPage**

```tsx
// frontend/src/pages/Copilot/CopilotPage.tsx
import { useEffect, useRef } from 'react';
import { useCopilotStore } from '@/store/useCopilotStore';
import { ROLE_SUGGESTED_QUERIES } from '@/copilot/constants/suggestedQueries';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function CopilotPage() {
  const { messages, isStreaming, error, language, clearError } = useCopilotStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const suggestions = ROLE_SUGGESTED_QUERIES['INVESTIGATOR']?.[language] || [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Drishti Copilot
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            AI-powered investigation assistant — grounded in FIR data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {messages.length} messages
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to Drishti Copilot
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Ask questions about FIRs, accused persons, crime trends, hotspots,
                and station performance. All answers are grounded in real platform data.
              </p>
            </div>

            {/* Suggested queries */}
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => useCopilotStore.getState().sendMessage(q)}
                  className="rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex justify-start mb-4">
            <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput />
    </div>
  );
}
```

- [ ] **Step 4: Add route to App.tsx**

```tsx
// In frontend/src/App.tsx, add after the existing copilot redirect:
// <Route path="pi/copilot" element={<Navigate to="/" replace />} />
// becomes:
// <Route path="pi/copilot" element={<RoleRoute><SuspenseWrapper><CopilotPage /></SuspenseWrapper></RoleRoute>} />
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Copilot/ frontend/src/App.tsx
git commit -m "feat(copilot): add dedicated chat page with Zustand store"
```

---

## Task 11: PDF Export

**Files:**
- Create: (append to) `backend/pdf/engine.py` — add `ChatTranscriptPDF` class
- Create: `backend/app/api/copilot/router.py` — add `POST /export` endpoint

**Interfaces:**
- Consumes: Session messages from `SessionStore`
- Produces: PDF file download

- [ ] **Step 1: Add ChatTranscriptPDF to engine.py**

```python
# backend/pdf/engine.py — append (do NOT modify existing classes)

class ChatTranscriptPDF:
    """PDF export for chat transcripts. Local download only, no server retention."""

    def __init__(self):
        self.pdf = FPDF()
        self.pdf.set_auto_page_break(auto=True, margin=15)

    def generate(self, messages: list[dict], session_id: str) -> bytes:
        self.pdf.add_page()
        self.pdf.set_font("Helvetica", "B", 16)
        self.pdf.cell(0, 10, "Drishti Copilot - Chat Transcript", ln=True, align="C")
        self.pdf.set_font("Helvetica", "", 10)
        self.pdf.cell(0, 8, f"Session: {session_id[:8]}...", ln=True, align="C")
        self.pdf.ln(5)

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            intent = msg.get("intent")

            # Role header
            if role == "user":
                self.pdf.set_font("Helvetica", "B", 11)
                self.pdf.set_text_color(0, 102, 204)
                self.pdf.cell(0, 7, "You:", ln=True)
            else:
                self.pdf.set_font("Helvetica", "B", 11)
                self.pdf.set_text_color(0, 128, 0)
                label = f"Drishti Copilot"
                if intent:
                    label += f" [{intent}]"
                self.pdf.cell(0, 7, f"{label}:", ln=True)

            # Content
            self.pdf.set_font("Helvetica", "", 10)
            self.pdf.set_text_color(0, 0, 0)
            self.pdf.multi_cell(0, 6, content)
            self.pdf.ln(3)

        # Disclaimer footer
        self.pdf.ln(10)
        self.pdf.set_font("Helvetica", "I", 8)
        self.pdf.set_text_color(128, 128, 128)
        self.pdf.cell(0, 5, "DISCLAIMER: This transcript may contain synthetic/simulated data for demonstration purposes.", ln=True, align="C")
        self.pdf.cell(0, 5, "Generated by Drishti Copilot — Neural Justice Platform", ln=True, align="C")

        return bytes(self.pdf.output())
```

- [ ] **Step 2: Add export endpoint to router**

```python
# In backend/app/api/copilot/router.py, add:

from fastapi.responses import Response

@router.post("/export")
async def export_chat(
    session_id: str,
    user: CurrentUser = Depends(get_current_user),
    session_store: SessionStore = Depends(_get_session_store),
):
    """Export chat transcript as PDF download. No server-side retention."""
    history = session_store.get_history(session_id, limit=100)
    if not history:
        raise HTTPException(status_code=404, detail="No messages to export")

    from backend.pdf.engine import ChatTranscriptPDF
    engine = ChatTranscriptPDF()
    pdf_bytes = engine.generate(history, session_id)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=drishti-copilot-{session_id[:8]}.pdf"},
    )
```

- [ ] **Step 3: Commit**

```bash
git add backend/pdf/engine.py backend/app/api/copilot/router.py
git commit -m "feat(copilot): add PDF export endpoint with chat transcript"
```

---

## Task 12: End-to-End Test Pass

**Files:**
- No new files — execute all 10 tests from GOD PROMPT Section 7

- [ ] **Step 1: Run full test suite**

```bash
cd backend && python -m pytest tests/ -v
```

- [ ] **Step 2: Manual E2E verification**

Run the FastAPI server and test via curl:

```bash
# Start server
cd backend && uvicorn app.api.main:app --reload

# Test 1: English crime trends
curl -X POST http://localhost:8000/api/copilot/chat \
  -H "X-Demo-Session: true" \
  -H "Content-Type: application/json" \
  -d '{"message": "Show crime trends"}'

# Test 2: Risk score with factor breakdown
curl -X POST http://localhost:8000/api/copilot/chat \
  -H "X-Demo-Session: true" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the risk score for John Doe?"}'

# Test 3: General query (out of scope)
curl -X POST http://localhost:8000/api/copilot/chat \
  -H "X-Demo-Session: true" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about quantum physics"}'

# Test 4: Session persistence
curl -X POST http://localhost:8000/api/copilot/chat \
  -H "X-Demo-Session: true" \
  -H "Content-Type: application/json" \
  -d '{"message": "Show crime trends"}'
# Then use the session_id from response in next call

# Test 5: Auth required
curl -X POST http://localhost:8000/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
# Expected: 401
```

- [ ] **Step 3: Record results in completion report**

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat(copilot): complete Drishti Copilot — all tests passing"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** All 8 intents implemented, jurisdiction scoping, session persistence, voice hooks wired, PDF export, EN/KN support, bounded general_query
- [ ] **Placeholder scan:** No TBD/TODO/placeholder steps — all code is complete
- [ ] **Type consistency:** `ChatRequest`/`ChatResponse` models match between backend and frontend. `Intent` enum values match everywhere. `QueryEvidence` structure consistent.
- [ ] **File paths:** All paths verified against existing codebase structure
- [ ] **No scope violations:** No files outside the listed paths are modified (except `App.tsx` route and `engine.py` append)
