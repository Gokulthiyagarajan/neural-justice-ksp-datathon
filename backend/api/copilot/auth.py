"""
Auth dependencies for the copilot router.

Mirrors the JWT verification logic from functions/neural-justice-backend/main.py:240-282
but adapted for FastAPI Depends() pattern.
"""
import os
import base64
import json
import logging
import time
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
