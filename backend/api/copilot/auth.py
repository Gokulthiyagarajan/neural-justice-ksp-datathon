"""
Auth dependencies for the copilot router.

Mirrors the JWT verification logic from functions/neural-justice-backend/main.py:240-282
but adapted for FastAPI Depends() pattern.
"""
import os
import base64
import hmac
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from fastapi import Depends, Header, HTTPException

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get("JWT_SECRET_KEY", os.environ.get("JWT_SECRET", "neural-justice-dev-secret"))

# SECURITY (F-020): never run production with the hardcoded dev JWT secret. Fail
# closed so a misconfiguration cannot silently accept forged tokens.
if IS_PRODUCTION and JWT_SECRET in ("neural-justice-dev-secret", "dev-secret", ""):
    raise RuntimeError(
        "Refusing to start in production with a default/empty JWT_SECRET. "
        "Set JWT_SECRET_KEY to a strong, unique value."
    )

# Demo login is an unauthenticated SUPER_ADMIN grant and must NEVER be available
# in production. It is gated behind an explicit opt-in flag AND a shared secret.
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development").lower() in ("production", "prod")
DEMO_LOGIN_ENABLED = os.environ.get("COPILOT_DEMO_ENABLED", "0") == "1"
DEMO_SESSION_SECRET = os.environ.get("DEMO_SESSION_TOKEN", "")


def _b64url_decode(segment: str) -> bytes:
    pad = "=" * (4 - len(segment) % 4)
    return base64.urlsafe_b64decode(segment + pad)


def _demo_login_allowed(provided: Optional[str]) -> bool:
    """True only when demo login is explicitly opted-in, non-production, and the
    supplied X-Demo-Session value matches the configured secret."""
    if IS_PRODUCTION or not DEMO_LOGIN_ENABLED or not DEMO_SESSION_SECRET:
        return False
    if not provided:
        return False
    return hmac.compare_digest(provided, DEMO_SESSION_SECRET)


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
    """Verify an HS256 JWT and return the payload if valid, else None.

    SECURITY (F-001): previously this only base64-decoded the payload and checked
    `exp` — the HMAC signature was NEVER verified, so anyone could forge a token
    with arbitrary roles/jurisdiction. We now verify the signature with a constant-
    time compare and reject any `alg` other than HS256.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts

        # Reject algorithm confusion.
        try:
            header = json.loads(_b64url_decode(header_b64))
        except Exception:
            return None
        if header.get("alg") != "HS256":
            return None

        expected_sig = hmac.new(
            JWT_SECRET.encode(),
            f"{header_b64}.{payload_b64}".encode(),
            hashlib.sha256,
        ).digest()
        try:
            provided_sig = _b64url_decode(sig_b64)
        except Exception:
            return None
        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        payload = json.loads(_b64url_decode(payload_b64))
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
    # SECURITY (F-002): previously any non-empty X-Demo-Session header granted an
    # unauthenticated SUPER_ADMIN session. Now it only works when demo login is
    # explicitly enabled, non-production, and the value matches DEMO_SESSION_TOKEN.
    if x_demo_session:
        if not _demo_login_allowed(x_demo_session):
            raise HTTPException(
                status_code=401,
                detail="Demo login is disabled or misconfigured",
            )
        return CurrentUser(
            username="demo",
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
