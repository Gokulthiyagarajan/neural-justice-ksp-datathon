"""Tests for DataStore abstraction layer."""
import pytest
from backend.api.copilot.datastore import DataStore, SqliteDataStore


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
    from abc import ABC
    assert issubclass(DataStore, ABC)
