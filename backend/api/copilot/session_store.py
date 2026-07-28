"""
Session persistence — stores conversation history in SQLite tables.
Additive only: creates chat_sessions and chat_messages tables.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Any
from backend.api.copilot.datastore import DataStore

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
