"""Tests for session store."""
import pytest
from backend.api.copilot.session_store import SessionStore
from backend.api.copilot.datastore import SqliteDataStore


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
    assert info["message_count"] == 1
