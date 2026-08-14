"""Tests for auth dependencies."""
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from backend.api.copilot.auth import get_current_user, get_jurisdiction_scope, CurrentUser, JurisdictionScope

app = FastAPI()


@app.get("/test-auth")
async def do_test_auth(user: CurrentUser = Depends(get_current_user)):
    return {"username": user.username, "roles": user.roles}


@app.get("/test-jurisdiction")
async def do_test_jurisdiction(scope: JurisdictionScope = Depends(get_jurisdiction_scope)):
    return {"district_id": scope.district_id, "station_id": scope.station_id}


client = TestClient(app)


def test_auth_demo_session():
    resp = client.get("/test-auth", headers={"X-Demo-Session": "test-demo-token"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"
    assert "SUPER_ADMIN" in resp.json()["roles"]


def test_auth_no_header_returns_401():
    resp = client.get("/test-auth")
    assert resp.status_code == 401


def test_jurisdiction_demo_session():
    resp = client.get("/test-jurisdiction", headers={"X-Demo-Session": "test-demo-token"})
    assert resp.status_code == 200
    assert "district_id" in resp.json()


def test_current_user_model():
    u = CurrentUser(username="test", roles=["INVESTIGATOR"], district_id=1, station_id=1)
    assert u.username == "test"
    assert u.is_super_admin is False


def test_current_user_super_admin():
    u = CurrentUser(username="admin", roles=["SUPER_ADMIN"], district_id=1, station_id=1)
    assert u.is_super_admin is True
