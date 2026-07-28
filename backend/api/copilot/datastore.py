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
    """sqlite3 implementation — current production backend.

    For in-memory databases (:memory:), uses a persistent connection
    so the schema survives across query/execute calls.
    For file databases, uses a fresh connection per call (safe for WAL mode).
    """

    def __init__(self, db_path: str):
        self._db_path = db_path
        self._is_memory = db_path == ":memory:" or ":memory:" in db_path
        self._persistent_conn: sqlite3.Connection | None = None

    @classmethod
    def from_env(cls) -> "SqliteDataStore":
        """Create from DATABASE_URL env var (matches existing backend pattern)."""
        db_path = os.environ.get("DATABASE_URL", "sqlite:///./neural_justice.db")
        if db_path.startswith("sqlite:///"):
            db_path = db_path[len("sqlite:///"):]
        return cls(db_path)

    def _connect(self) -> sqlite3.Connection:
        if self._is_memory:
            if self._persistent_conn is None:
                self._persistent_conn = sqlite3.connect(
                    self._db_path, check_same_thread=False
                )
                self._persistent_conn.row_factory = sqlite3.Row
            return self._persistent_conn
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def query(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        conn = self._connect()
        cursor = conn.execute(sql, params)
        rows = cursor.fetchall()
        result = [dict(row) for row in rows]
        if not self._is_memory:
            conn.close()
        return result

    def execute(self, sql: str, params: tuple = ()) -> int:
        conn = self._connect()
        cursor = conn.execute(sql, params)
        if not self._is_memory:
            conn.commit()
            conn.close()
        else:
            conn.commit()
        return cursor.rowcount


# ── Singleton for app-wide use ──
_datastore: DataStore | None = None


def get_datastore() -> DataStore:
    """Get the app-wide DataStore instance."""
    global _datastore
    if _datastore is None:
        _datastore = SqliteDataStore.from_env()
        logger.info("DataStore initialized: %s", type(_datastore).__name__)
    return _datastore
