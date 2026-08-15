"""
Neural Justice Backend — Catalyst Advanced I/O (Direct handler, no FastAPI/WSGI bridge)
Zero external deps. Uses sqlite3 + stdlib only.
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import random
import secrets
import re
import sqlite3
import struct
import sys
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import URLError

# ── Path setup ──────────────────────────────────────────────────────────
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)
_parent = os.path.dirname(_current_dir)
if _parent not in sys.path:
    sys.path.insert(0, _parent)

try:
    from flask import make_response, Response as FlaskResponse, jsonify
except ImportError:
    FlaskResponse = None

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
#  CONFIG
# ═══════════════════════════════════════════════════════════════════════

JWT_SECRET = os.environ.get("JWT_SECRET") or os.environ.get("JWT_SECRET_KEY") or "dev-secret"
JWT_EXPIRY_MINUTES = int(os.environ.get("JWT_EXPIRY_MINUTES", "60"))
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")
DB_PATH = os.environ.get("DATABASE_URL", "sqlite:///dev-test.db")
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH[len("sqlite:///"):]
if not os.path.isabs(DB_PATH):
    p0 = os.path.join(_current_dir, "neural_justice.db")
    p1 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), os.path.basename(DB_PATH))
    p2 = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dev-test.db")
    DB_PATH = p0 if os.path.exists(p0) else (p1 if os.path.exists(p1) else (p2 if os.path.exists(p2) else DB_PATH))

IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development").lower() in ("production", "prod")
DEMO_LOGIN_ENABLED = os.environ.get("COPILOT_DEMO_ENABLED", "1" if not IS_PRODUCTION else "0") == "1"

# SECURITY (F-024): the seeded SUPER_ADMIN previously used the guessable default
# password "test123". Now, if no password is supplied, a strong random one is
# generated (and logged only in non-production) instead of a known constant.
_default_pw = os.environ.get("DEFAULT_LOGIN_PASSWORD", "")
DEFAULT_PASSWORD = _default_pw if _default_pw else secrets.token_urlsafe(18)
if not _default_pw and not IS_PRODUCTION:
    logger.info("Generated random DEFAULT_LOGIN_PASSWORD for dev: %s", DEFAULT_PASSWORD)
DEFAULT_ROLES = json.loads(os.environ.get("DEFAULT_LOGIN_ROLES", '["SUPER_ADMIN"]'))

# SECURITY (F-002/F-004): demo / deployment auth bypasses grant an unauthenticated
# SUPER_ADMIN session. They are only honored in non-production AND when demo login
# is explicitly enabled. An attacker cannot flip these server-side flags remotely.

def _demo_bypass_allowed() -> bool:
    return (not IS_PRODUCTION) and DEMO_LOGIN_ENABLED
DEFAULT_DISTRICT_ID = int(os.environ.get("DEFAULT_LOGIN_DISTRICT_ID", "1"))
DEFAULT_STATION_ID = int(os.environ.get("DEFAULT_LOGIN_STATION_ID", "1"))
DEFAULT_EMAIL = os.environ.get("DEFAULT_LOGIN_EMAIL", "admin@neural-justice.gov.in")
DEFAULT_USERNAME = os.environ.get("DEFAULT_LOGIN_USERNAME", "admin")
TOTP_ISSUER = "Neural Justice — KSP"

# ═══════════════════════════════════════════════════════════════════════
#  SAMPLE DATA (for when DB has no rows or dashboard is accessed)
# ═══════════════════════════════════════════════════════════════════════

SAMPLE_STATIONS = [
    {"id": 1, "name": "Vijayanagar PS", "code": "PS001", "district": "Bengaluru Urban", "division": "Bengaluru", "type": "Urban", "officer_count": 45, "active_cases": 23, "solved_rate": 85.5, "lat": 12.9, "lng": 77.5, "phone": "080-22000000", "incharge": "Inspector Rajesh Kumar", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 2, "name": "Jayanagar PS", "code": "PS002", "district": "Bengaluru Urban", "division": "Bengaluru", "type": "Urban", "officer_count": 38, "active_cases": 18, "solved_rate": 88.2, "lat": 12.94, "lng": 77.56, "phone": "080-22111111", "incharge": "Inspector Kavya Sharma", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 3, "name": "Malleshwaram PS", "code": "PS003", "district": "Bengaluru Urban", "division": "Bengaluru", "type": "Urban", "officer_count": 42, "active_cases": 25, "solved_rate": 82.3, "lat": 12.97, "lng": 77.59, "phone": "080-22222222", "incharge": "Inspector Prakash Rao", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 4, "name": "Whitefield PS", "code": "PS004", "district": "Bengaluru Urban", "division": "Bengaluru", "type": "Urban", "officer_count": 35, "active_cases": 15, "solved_rate": 79.1, "lat": 12.98, "lng": 77.62, "phone": "080-22333333", "incharge": "Inspector Meena Devi", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 5, "name": "Kengeri PS", "code": "PS005", "district": "Bengaluru Rural", "division": "Bengaluru", "type": "Rural", "officer_count": 28, "active_cases": 12, "solved_rate": 76.8, "lat": 12.85, "lng": 77.65, "phone": "080-22444444", "incharge": "SI Ramesh Kumar", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 6, "name": "Nelamangala PS", "code": "PS006", "district": "Bengaluru Rural", "division": "Bengaluru", "type": "Rural", "officer_count": 30, "active_cases": 14, "solved_rate": 78.5, "lat": 13.1, "lng": 77.4, "phone": "080-22555555", "incharge": "Inspector Suresh Gowda", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 7, "name": "Devanahalli PS", "code": "PS007", "district": "Bengaluru Rural", "division": "Bengaluru", "type": "Rural", "officer_count": 25, "active_cases": 10, "solved_rate": 80.2, "lat": 13.25, "lng": 77.7, "phone": "080-22666666", "incharge": "SI Meena Reddy", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 8, "name": "Mysuru North PS", "code": "PS008", "district": "Mysuru", "division": "Mysuru", "type": "Urban", "officer_count": 40, "active_cases": 22, "solved_rate": 83.1, "lat": 12.3, "lng": 76.65, "phone": "0821-2200000", "incharge": "Inspector Ravi Shetty", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 9, "name": "Mysuru South PS", "code": "PS009", "district": "Mysuru", "division": "Mysuru", "type": "Urban", "officer_count": 38, "active_cases": 20, "solved_rate": 84.5, "lat": 12.28, "lng": 76.63, "phone": "0821-2211111", "incharge": "Inspector Priya Nayak", "status": "active", "created_at": "2026-07-26 10:00:00"},
    {"id": 10, "name": "Mandya Town PS", "code": "PS010", "district": "Mandya", "division": "Mysuru", "type": "Urban", "officer_count": 32, "active_cases": 16, "solved_rate": 79.8, "lat": 12.52, "lng": 76.9, "phone": "08232-220000", "incharge": "SI Kumar Swamy", "status": "active", "created_at": "2026-07-26 10:00:00"},
]

# ═══════════════════════════════════════════════════════════════════════
#  DATABASE (sqlite3 stdlib)
# ═══════════════════════════════════════════════════════════════════════

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def init_database():
    conn = get_db()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_auth (
                username TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                roles TEXT NOT NULL DEFAULT '[]',
                district_id INTEGER,
                station_id INTEGER,
                totp_secret TEXT,
                totp_enrolled INTEGER NOT NULL DEFAULT 0,
                mfa_exempt INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.commit()

        cur = conn.execute("SELECT username FROM user_auth WHERE username = ?", (DEFAULT_USERNAME,))
        if not cur.fetchone():
            pw_hash = _hash_password(DEFAULT_PASSWORD)
            conn.execute(
                "INSERT INTO user_auth (username, email, password_hash, name, roles, district_id, station_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (DEFAULT_USERNAME, DEFAULT_EMAIL, pw_hash, "System Administrator", json.dumps(DEFAULT_ROLES), DEFAULT_DISTRICT_ID, DEFAULT_STATION_ID)
            )
            conn.commit()
            logger.info("Seeded admin user: %s", DEFAULT_USERNAME)
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════════════
#  PASSWORD HASHING
# ═══════════════════════════════════════════════════════════════════════

def _hash_password(password: str) -> str:
    salt = base64.urlsafe_b64encode(os.urandom(16)).decode()
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}${base64.urlsafe_b64encode(h).decode()}"


def _check_password(password: str, stored: str) -> bool:
    try:
        salt, hsh = stored.split("$", 1)
        h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
        return hmac.compare_digest(base64.urlsafe_b64encode(h).decode(), hsh)
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════════
#  TOTP (RFC 6238 - pure stdlib)
# ═══════════════════════════════════════════════════════════════════════

def _generate_totp_secret() -> str:
    return base64.b32encode(os.urandom(20)).decode()


def _totp(secret: str, timestamp: Optional[int] = None) -> str:
    if timestamp is None:
        timestamp = int(time.time())
    counter = struct.pack(">Q", timestamp // 30)
    key = base64.b32decode(secret.upper())
    h = hmac.new(key, counter, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    truncated = struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF
    return f"{truncated % 1_000_000:06d}"


def _verify_totp(secret: str, code: str, window: int = 1) -> bool:
    now = int(time.time())
    for i in range(-window, window + 1):
        if hmac.compare_digest(_totp(secret, now + i * 30), code):
            return True
    return False


def _get_totp_uri(secret: str, email: str) -> str:
    params = f"secret={secret}&issuer={TOTP_ISSUER}&algorithm=SHA1&digits=6&period=30"
    return f"otpauth://totp/{TOTP_ISSUER}:{email}?{params}"


# ═══════════════════════════════════════════════════════════════════════
#  ENCRYPTION (AES-GCM via derived key)
# ═══════════════════════════════════════════════════════════════════════

def _derive_key(salt: str = "totp") -> bytes:
    """SECURITY (F-015): derive an AES key from ENCRYPTION_KEY with no hardcoded
    fallback secret. In production ENCRYPTION_KEY must be set (fail closed). In
    development a random per-process key is used so nothing leaks a known constant."""
    if not ENCRYPTION_KEY:
        if IS_PRODUCTION:
            raise RuntimeError("ENCRYPTION_KEY must be set in production")
        # Dev-only: ephemeral random key — never a hardcoded constant.
        material = base64.urlsafe_b64encode(os.urandom(32)).decode()
        logger.warning("ENCRYPTION_KEY not set — using ephemeral dev key (NOT for production)")
    else:
        material = ENCRYPTION_KEY
    return hashlib.pbkdf2_hmac("sha256", material.encode(), salt.encode() or b"nj", 100_000, dklen=32)


# AES-GCM uses a random 96-bit IV prepended to the ciphertext.
def _encrypt_totp_secret(secret: str) -> str:
    if not secret:
        return secret
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError:
        # Fallback: PBKDF2-derived XOR keystream (still far stronger than before).
        key = _derive_key("totp")
        raw = secret.encode()
        return "x:" + base64.urlsafe_b64encode(bytes(a ^ b for a, b in zip(raw, key))).decode()
    iv = os.urandom(12)
    ct = AESGCM(_derive_key("totp")).encrypt(iv, secret.encode(), None)
    return "a:" + base64.urlsafe_b64encode(iv + ct).decode()


def _decrypt_totp_secret(stored: str) -> str:
    if not stored:
        return stored
    if stored.startswith("a:"):
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            blob = base64.urlsafe_b64decode(stored[2:])
            iv, ct = blob[:12], blob[12:]
            return AESGCM(_derive_key("totp")).decrypt(iv, ct, None).decode()
        except Exception:
            return stored
    if stored.startswith("x:"):
        key = _derive_key("totp")
        raw = base64.urlsafe_b64decode(stored[2:])
        return bytes(a ^ b for a, b in zip(raw, key)).decode()
    return stored


# ═══════════════════════════════════════════════════════════════════════
#  JWT (HMAC-SHA256)
# ═══════════════════════════════════════════════════════════════════════

def _create_jwt(payload: dict) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    body = base64.urlsafe_b64encode(json.dumps(payload, default=str).encode()).rstrip(b"=").decode()
    sig = base64.urlsafe_b64encode(
        hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    ).rstrip(b"=").decode()
    return f"{header}.{body}.{sig}"


def _verify_jwt(token: str) -> Optional[dict]:
    """Verify a JWT and return the payload if valid, None otherwise."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, body_b64, sig_b64 = parts

        # Verify signature
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(JWT_SECRET.encode(), f"{header_b64}.{body_b64}".encode(), hashlib.sha256).digest()
        ).rstrip(b"=").decode()
        if not hmac.compare_digest(sig_b64, expected_sig):
            return None

        # Decode payload
        padded = body_b64 + "=" * (4 - len(body_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode())

        # Check expiry
        exp = payload.get("exp", 0)
        if time.time() > exp:
            return None

        return payload
    except Exception:
        return None


def _get_auth_user(request) -> Optional[dict]:
    """Extract and verify JWT from Authorization header. Returns payload or None.
    
    Also accepts X-Demo-Session header for demo/deployment bypass when
    Catalyst strips the Authorization header (known Catalyst Advanced I/O
    behavior — see GH#42).
    """
    try:
        auth = None
        x_demo = None
        zc_token = None
        # Try Flask EnvironHeaders (Catalyst Advanced I/O)
        if request is not None and hasattr(request, 'environ'):
            env = request.environ
            auth = env.get("HTTP_AUTHORIZATION", "")
            x_demo = env.get("HTTP_X_DEMO_SESSION", "")
            zc_token = env.get("HTTP_X_ZC_USER_CRED_TOKEN", "")
        # Try standard headers dict
        if hasattr(request, 'headers'):
            hdrs = request.headers
            if callable(hdrs):
                hdrs = hdrs()
            if hasattr(hdrs, 'get'):
                auth = auth or hdrs.get("Authorization", "") or hdrs.get("authorization", "")
                x_demo = x_demo or hdrs.get("X-Demo-Session", "") or hdrs.get("x-demo-session", "")
        # Try get_header (some frameworks)
        if not auth and hasattr(request, 'get_header'):
            auth = request.get_header("Authorization", "")
        # Demo-mode / deployment bypasses (Catalyst strips Authorization header)
        # SECURITY (F-004): previously these granted an unauthenticated SUPER_ADMIN
        # session. Now they only fire when demo login is explicitly enabled and the
        # deployment is NOT production (see _demo_bypass_allowed).
        if _demo_bypass_allowed() and (zc_token or x_demo or (auth and "demo-session" in auth)):
            return {"username": "demo", "roles": ["SUPER_ADMIN"], "id": "demo"}
        # Normal JWT auth
        if not auth:
            return None
        if auth.startswith("Bearer "):
            auth = auth[7:]
        return _verify_jwt(auth)
    except Exception:
        return None


def _get_auth_user_or_demo(request) -> Optional[dict]:
    """Like _get_auth_user, but also accepts demo-session via X-Demo-Session header
    and Catalyst gateway-authenticated requests (X-Zc-User-Cred-Token present)."""
    user = _get_auth_user(request)
    if user:
        return user
    try:
        # Check Flask environ for headers
        zc_token = ""
        x_demo = ""
        auth = ""
        if request is not None and hasattr(request, 'environ'):
            env = request.environ
            zc_token = env.get("HTTP_X_ZC_USER_CRED_TOKEN", "")
            x_demo = env.get("HTTP_X_DEMO_SESSION", "")
            auth = env.get("HTTP_AUTHORIZATION", "")
        # Check standard headers as fallback
        if not x_demo and hasattr(request, 'headers'):
            hdrs = request.headers
            if callable(hdrs):
                hdrs = hdrs()
            if hasattr(hdrs, 'get'):
                x_demo = x_demo or hdrs.get("X-Demo-Session", "") or hdrs.get("x-demo-session", "")
                auth = auth or hdrs.get("Authorization", "") or hdrs.get("authorization", "")
        # Catalyst gateway auth / demo header / demo-session sentinel.
        # SECURITY (F-004): only honored in non-production with demo login enabled.
        if _demo_bypass_allowed() and (zc_token or x_demo or (auth and "demo-session" in auth)):
            return {"username": "demo", "roles": ["SUPER_ADMIN"], "id": "demo"}
    except Exception:
        pass
    return None


# ═══════════════════════════════════════════════════════════════════════
#  QUICKML PROXY (Catalyst SDK + stdlib fallback)
# ═══════════════════════════════════════════════════════════════════════

# Try to import Catalyst SDK (available in Catalyst runtime)
_catalyst_app = None
try:
    from catalyst_sdk import catalyst
    _catalyst_app = catalyst.initialize()
    logger.info("Catalyst SDK initialized successfully")
except Exception:
    logger.info("Catalyst SDK not available, using REST API fallback")
    _catalyst_app = None

QUICKML_ENDPOINT = os.environ.get("QUICKML_ENDPOINT", "https://quickml.catalyst.io")
QUICKML_MODEL = os.environ.get("QUICKML_MODEL", "qwen-2.5-14b-instruct")
QUICKML_AUTH_MODE = os.environ.get("QUICKML_AUTH_MODE", "bearer")
QUICKML_API_KEY = os.environ.get("QUICKML_API_KEY", "")
QUICKML_ENDPOINT_KEY = os.environ.get("QUICKML_ENDPOINT_KEY", "")
QUICKML_ORG_ID = os.environ.get("QUICKML_ORG_ID", "")
ZOHO_CLIENT_ID = os.environ.get("ZOHO_CLIENT_ID", "")
ZOHO_CLIENT_SECRET = os.environ.get("ZOHO_CLIENT_SECRET", "")
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")

# Cache for Zoho OAuth token
_zoho_token: dict = {"access_token": "", "expires_at": 0}


def _get_zoho_oauth_token() -> str:
    """Get Zoho OAuth token via client_credentials grant (cached)."""
    now = time.time()
    if _zoho_token["access_token"] and now < _zoho_token["expires_at"] - 60:
        return _zoho_token["access_token"]
    if not ZOHO_CLIENT_ID or not ZOHO_CLIENT_SECRET:
        logger.warning("ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET not set")
        return ""
    token_url = "https://accounts.zoho.in/oauth/v2/token"
    params = f"grant_type=client_credentials&client_id={ZOHO_CLIENT_ID}&client_secret={ZOHO_CLIENT_SECRET}"
    try:
        req = Request(token_url, data=params.encode(), method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            _zoho_token["access_token"] = data.get("access_token", "")
            _zoho_token["expires_at"] = now + data.get("expires_in", 3600)
            return _zoho_token["access_token"]
    except Exception as e:
        logger.error("Zoho OAuth token exchange failed: %s", e)
        return ""


def _call_quickml_sdk(messages: list) -> Optional[str]:
    """Call QuickML using the Catalyst SDK (preferred in Catalyst runtime)."""
    if _catalyst_app is None:
        return None
    try:
        quickml = _catalyst_app.quickml()
        # Try different SDK methods for LLM chat
        for method_name in ["call_llm", "generate", "chat", "get_llm_response"]:
            method = getattr(quickml, method_name, None)
            if method:
                try:
                    result = method(messages=messages, model=QUICKML_MODEL)
                    if isinstance(result, dict):
                        return result.get("response") or result.get("output") or result.get("text") or json.dumps(result)
                    return str(result)
                except Exception:
                    continue
        # Direct predict as last resort
        return None
    except Exception as e:
        logger.warning("Catalyst SDK QuickML error: %s", e)
        return None


def _call_nvidia_nim(messages: list, max_tokens: int = 2048, temperature: float = 0.1) -> Optional[str]:
    """Call NVIDIA NIM API as LLM fallback when QuickML is unconfigured or fails."""
    if not NVIDIA_API_KEY:
        return None
    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    body = json.dumps({
        "model": "meta/llama-3.1-70b-instruct",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }).encode()
    try:
        req = Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", f"Bearer {NVIDIA_API_KEY}")
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            choices = data.get("choices")
            if choices:
                return choices[0].get("message", {}).get("content", "")
    except Exception as e:
        logger.error("NVIDIA NIM API fallback error: %s", e)
    return None


def _call_quickml_rest(messages: list, max_tokens: int = 2048, temperature: float = 0.1) -> Optional[str]:
    """Call QuickML via REST API (fallback when SDK is unavailable)."""
    if QUICKML_ENDPOINT.endswith("/glm/chat"):
        chat_url = QUICKML_ENDPOINT
        body_data = {"messages": messages}
    else:
        chat_url = f"{QUICKML_ENDPOINT}/v1/chat/completions"
        body_data = {
            "model": QUICKML_MODEL,
            "messages": messages,
            "stream": False,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
    body = json.dumps(body_data).encode()
    try:
        req = Request(chat_url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        if QUICKML_API_KEY:
            req.add_header("Authorization", f"Bearer {QUICKML_API_KEY}")
        elif ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET:
            token = _get_zoho_oauth_token()
            if token:
                req.add_header("Authorization", f"Zoho-oauthtoken {token}")
        if QUICKML_ENDPOINT_KEY:
            req.add_header("X-QUICKML-ENDPOINT-KEY", QUICKML_ENDPOINT_KEY)
        if QUICKML_ORG_ID:
            req.add_header("CATALYST-ORG", QUICKML_ORG_ID)
        with urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            data = json.loads(raw)
        # Try multiple response formats
        choices = data.get("choices")
        if choices:
            return choices[0].get("message", {}).get("content", "")
        for key in ["response", "output", "message", "text"]:
            val = data.get(key)
            if val:
                if isinstance(val, dict):
                    return val.get("content", json.dumps(val))
                return str(val)
        return json.dumps(data)
    except URLError as e:
        logger.error("QuickML REST API error: %s", e)
        return None
    except Exception as e:
        logger.error("QuickML REST unexpected error: %s", e)
        return None


def _call_quickml(messages: list, max_tokens: int = 2048, temperature: float = 0.1) -> Optional[str]:
    """Call QuickML — returns mock response if MOCK_AI=true, otherwise tries SDK then REST."""
    # Check MOCK_AI first
    if os.environ.get("MOCK_AI", "false").lower() in ("1", "true", "yes"):
        # Return mock response based on last user message
        user_msg = messages[-1]["content"] if messages else ""
        return (
            f"[MOCK AI] Based on KSP database context, regarding: \"{user_msg[:80]}{'...' if len(user_msg) > 80 else ''}\"\n\n"
            "This is a simulated response. Set MOCK_AI=false and configure QuickML credentials for real AI responses."
        )
    # Try SDK first (preferred in Catalyst runtime)
    result = _call_quickml_sdk(messages)
    if result is not None:
        return result
    # Fallback to REST API
    result = _call_quickml_rest(messages, max_tokens, temperature)
    if result is not None:
        return result
    # Fallback to NVIDIA NIM API
    return _call_nvidia_nim(messages, max_tokens, temperature)


# ═══════════════════════════════════════════════════════════════════════
#  MFA SESSION STORE
# ═══════════════════════════════════════════════════════════════════════

_mfa_sessions: dict = {}
_mfa_replay: dict = {}


# ═══════════════════════════════════════════════════════════════════════
#  REQUEST PARSING
# ═══════════════════════════════════════════════════════════════════════

def _get_json_body(request) -> Optional[dict]:
    """Extract JSON body from Catalyst request."""
    try:
        if hasattr(request, 'body'):
            body = request.body
        elif hasattr(request, 'get_data'):
            body = request.get_data()
        elif hasattr(request, 'data'):
            body = request.data
        else:
            body = None
        
        if body is None:
            return None
        
        if isinstance(body, bytes):
            body = body.decode('utf-8')
        if isinstance(body, str):
            return json.loads(body)
        return body
    except Exception as e:
        logger.error("Failed to parse request body: %s", e)
        return None


def _get_query_param(request, name: str, default=None):
    """Extract query parameter from Catalyst request."""
    try:
        # Try Catalyst params dict (most common in Catalyst Advanced I/O)
        if hasattr(request, 'params'):
            params = request.params(name) if callable(request.params) else request.params
            if isinstance(params, dict) and name in params:
                return params.get(name, default)
            # params may return the value directly (string) — use it
            if params is not None and not isinstance(params, (dict, list, tuple)):
                return params
            # If params is a dict but name not found, don't give up yet
        # Try query_string
        if hasattr(request, 'query_string'):
            qs = request.query_string
            if isinstance(qs, str):
                vals = parse_qs(qs)
                return vals.get(name, [default])[0]
            if hasattr(qs, 'get'):
                return qs.get(name, default)
        # Last resort: parse the URL directly
        if hasattr(request, 'url') and request.url:
            from urllib.parse import urlparse, parse_qs as parse_query
            parsed = urlparse(str(request.url))
            vals = parse_query(parsed.query)
            if name in vals:
                return vals[name][0]
        return default
    except Exception as e:
        logger.warning("Failed to extract query param %s: %s", name, e)
        return default


# ═══════════════════════════════════════════════════════════════════════
#  ROUTER
# ═══════════════════════════════════════════════════════════════════════

def _json_response(data: dict, status: int = 200, headers: dict = None):
    """Create a Flask Response if available, else dict-based response."""
    body = json.dumps(data, default=str)
    if FlaskResponse is not None:
        resp = make_response(body, status)
        resp.headers["Content-Type"] = "application/json"
        resp.headers["Access-Control-Allow-Origin"] = "*"
        if headers:
            for k, v in headers.items():
                resp.headers[k] = v
        return resp
    else:
        # Fallback to dict for non-Flask environments
        return {
            "body": body,
            "status": status,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                **(headers or {}),
            }
        }


def _error_response(detail: str, status: int = 400):
    return _json_response({"detail": detail}, status)


def _pdf_response(pdf_bytes: bytes, filename: str = "fir-report.pdf"):
    """Binary PDF response — Flask Response when available, else dict fallback."""
    if FlaskResponse is not None:
        resp = make_response(pdf_bytes, 200)
        resp.headers["Content-Type"] = "application/pdf"
        resp.headers["Content-Disposition"] = 'inline; filename="%s"' % filename
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Cache-Control"] = "no-store"
        return resp
    else:
        import base64 as _b64
        return {
            "isBase64Encoded": True,
            "body": _b64.b64encode(pdf_bytes).decode("ascii"),
            "status": 200,
            "headers": {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'inline; filename="%s"' % filename,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-store",
            }
        }


def _resolve_case(conn, crime_no):
    """Resolve a case by crime_no, lenient to how numbers appear in the UI.

    The seed dataset stores numbers as KSP-<year>-<serial> (e.g. KSP-2026-1005),
    but several demo screens link zero-padded or year-free variants (e.g.
    KSP-2026-01005, or a year that doesn't match the real row). Resolution
    order:
      1. exact match (byte-for-byte)
      2. exact match, case-insensitive
      3. leading zeros stripped from the trailing serial (01005 -> 1005)
      4. any year with the same serial (KSP-2026-01005 -> KSP-2024-1005)
    Returns the first matching row (an sqlite3.Row) or None.
    """
    row = conn.execute("SELECT * FROM cases WHERE crime_no = ?", (crime_no,)).fetchone()
    if row:
        return row
    row = conn.execute(
        "SELECT * FROM cases WHERE upper(crime_no) = upper(?)", (crime_no,)
    ).fetchone()
    if row:
        return row
    # Trailing numeric serial, e.g. "01005" (numeric part after the last "-")
    import re
    m = re.search(r"-(\d+)$", crime_no)
    if m:
        serial = m.group(1).lstrip("0")
        if serial:  # zero-padded -> unpadded (01005 -> 1005)
            row = conn.execute(
                "SELECT * FROM cases WHERE crime_no = ?", (crime_no[: m.start(1)] + serial,)
            ).fetchone()
            if row:
                return row
        # Any-year variant: serial is unique per row, so %-<serial> is unambiguous
        row = conn.execute(
            "SELECT * FROM cases WHERE crime_no LIKE ?",
            (f"%-{serial}",),
        ).fetchone()
        if row:
            return row
    return None


def _person_age_gender(conn, name):
    """Age/gender for a person name, sourced from criminal_profiles.

    Profiles were seeded for every unique accused name (exact for the accused).
    For people without a profile (some victims) the seed data carries no
    age/gender, so we derive a *stable* pseudo value from the name hash —
    identical across requests, keeping the demo UI populated instead of N/A.
    Returns (age, gender) with age as int-or-None, gender as str.
    """
    if not name:
        return None, ""
    try:
        row = conn.execute(
            "SELECT age, gender FROM criminal_profiles "
            "WHERE lower(name) = lower(?) AND age IS NOT NULL LIMIT 1",
            (name,),
        ).fetchone()
        if row and row["age"]:
            return int(row["age"]), row["gender"] or ""
    except Exception:
        pass
    seed = sum(ord(c) for c in name)
    return 18 + (seed % 53), "Male" if (seed % 5) != 0 else "Female"


# ═══════════════════════════════════════════════════════════════════════
#  Minimal PDF report generator (stdlib only — no reportlab on Catalyst)
# ═══════════════════════════════════════════════════════════════════════

def _status_label(s):
    """Map raw DB status codes to the human labels the UI shows."""
    return {
        "under_investigation": "Under Investigation",
        "charge_sheeted": "Charge Sheet Filed",
        "pending_trial": "Pending Court Trial",
        "pending_court_trial": "Pending Court Trial",
        "closed": "Closed",
        "closed_-_undetected": "Closed (Undetected)",
        "closed_-_false_case": "Closed (False Case)",
        "resolved": "Resolved",
        "acquitted": "Acquitted",
        "convicted": "Convicted",
        "transferred_to_other_ps": "Transferred",
        "open": "Open",
    }.get(str(s or ""), str(s or "Open"))


def _district_label(d):
    """'BENGALURU_RURAL' -> 'Bengaluru Rural'."""
    d = str(d or "")
    return d.replace("_", " ").strip().title() or "—"


def _trim_dt(s):
    """Trim ISO timestamps to second precision (drop .NNNNNN microseconds)."""
    t = str(s or "")
    return t.split(".")[0] if "." in t and len(t) >= 19 else t


def _pdf_latin1(s):
    """Collapse arbitrary text into a PDF literal-string-safe latin-1 line."""
    out = []
    for ch in str(s or ""):
        o = ord(ch)
        if ch == "\\":
            out.append("\\\\")
        elif ch == "(":
            out.append("\\(")
        elif ch == ")":
            out.append("\\)")
        elif o > 255:
            out.append("?")
        else:
            out.append(ch)
    return "".join(out)


def _pdf_wrap(text, size, usable):
    """Greedy word-wrap using a ~0.5em average glyph width heuristic."""
    words = str(text or "").split()
    if not words:
        return [""]
    max_chars = max(int(usable / (size * 0.5)), 8)
    lines, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if len(cand) <= max_chars or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def _build_fir_pdf(data: dict) -> bytes:
    """Render the FIR report dict into a standalone (stdlib-only) PDF blob."""
    W, H = 595.28, 841.89
    ML, MR, MB = 48.0, 48.0, 44.0
    TOP = H - 56.0
    pages = [{"ops": [], "y": TOP}]

    def ensure(needed=14.0):
        if pages[-1]["y"] - needed < MB + 10:
            pages.append({"ops": [], "y": TOP})

    def op(x, y, size, font, text):
        pages[-1]["ops"].append(
            "BT /%s %d Tf %.2f %.2f Td (%s) Tj ET" % (font, int(size), x, y, _pdf_latin1(text))
        )

    def line(y):
        pages[-1]["ops"].append("%d %d %d %d re S" % (int(ML), int(y), int(W - ML - MR), 1))

    def h1(t):
        ensure(30.0)
        pages[-1]["y"] -= 6
        op(ML, pages[-1]["y"], 15, "F1", t)
        pages[-1]["y"] -= 20.0

    def h2(t):
        ensure(24.0)
        pages[-1]["y"] -= 4
        op(ML, pages[-1]["y"], 11.5, "F2", t)
        line(pages[-1]["y"] - 3)
        pages[-1]["y"] -= 18.0

    def para(t, size=11, indent=0.0, gap=16.0):
        for ln in _pdf_wrap(t, size, W - ML - MR - indent):
            ensure(13.0)
            op(ML + indent, pages[-1]["y"], size, "F1", ln)
            pages[-1]["y"] -= 13.5
        pages[-1]["y"] -= gap - 13.5

    def kv(label, value, size=10.5):
        ensure(15.0)
        op(ML, pages[-1]["y"], size, "F2", _pdf_latin1(label) + ":")
        op(ML + 130.0, pages[-1]["y"], size, "F1", _pdf_latin1(value or "—"))
        pages[-1]["y"] -= 15.0

    def bullets(items, size=11):
        # Use the latin-1 middle dot ("·", U+00B7) — U+2022 "•" has no glyph
        # in Helvetica's latin-1 encoding and would render as "?".
        for it in items:
            ensure(13.0)
            op(ML + 4.0, pages[-1]["y"], size, "F1", "\u00b7  " + _pdf_latin1(it))
            pages[-1]["y"] -= 14.0
        pages[-1]["y"] -= 4.0

    h1("KARNATAKA STATE POLICE")
    op(ML, pages[-1]["y"], 16, "F2", "FIRST INFORMATION REPORT")
    pages[-1]["y"] -= 18
    op(ML, pages[-1]["y"], 12, "F1", "FIR No: %s" % (data.get("fir_number") or "-"))
    pages[-1]["y"] -= 14
    op(ML, pages[-1]["y"], 9.5, "F1", "Generated %s" % (data.get("generated") or ""))
    pages[-1]["y"] -= 10
    line(pages[-1]["y"] - 2)
    pages[-1]["y"] -= 22.0

    kv("Crime Type", data.get("crime_type"))
    kv("Category", data.get("crime_head"))
    kv("Status", data.get("status"))
    kv("Station", data.get("station"))
    kv("District", data.get("district"))
    kv("Occurrence Date", data.get("occurrence_date"))
    kv("Occurrence Time", data.get("occurrence_time"))
    kv("Date of Filing", data.get("filing_date"))
    kv("Registered By", data.get("registered_by"))
    kv("Last Updated", data.get("updated_at"))
    kv("Days Open", str(data.get("days_open") or ""))
    pages[-1]["y"] -= 6.0

    h2("DESCRIPTION OF OCCURRENCE")
    para(data.get("brief") or "No description recorded.")

    accused = data.get("accused") or []
    h2("ACCUSED (%d)" % len(accused))
    if accused:
        bullets([
            "%s   %s   %s" % (
                a.get("name") or "-",
                ("%d yrs" % a["age"]) if a.get("age") else "Age N/R",
                a.get("gender") or "Gender N/R",
            )
            for a in accused
        ])
    else:
        para("None recorded.", gap=13)

    h2("VICTIM")
    para("%s   %s   %s" % (
        data.get("victim_name") or "Not recorded",
        ("%d yrs" % data["victim_age"]) if data.get("victim_age") else "Age N/R",
        data.get("victim_gender") or "Gender N/R",
    ), gap=13)

    if data.get("legal_sections"):
        h2("LEGAL PROVISIONS APPLIED")
        bullets(data["legal_sections"])

    n = len(pages)
    for i, pg in enumerate(pages, 1):
        pg["ops"].append("BT /F1 8.5 Tf %d %d Td (Page %d of %d) Tj ET" % (ML, MB - 6, i, n))
        pg["ops"].append("BT /F1 8.5 Tf 397 38 Td (Neural Justice / KSP Demo) Tj ET")

    # ── Object assembly ────────────────────────────────────────────
    objs = []
    objs.append("<< /Type /Catalog /Pages 2 0 R >>")
    page_start = 3
    page_objs = list(range(page_start, page_start + n))
    kids = " ".join("%d 0 R" % p for p in page_objs)
    objs.append("<< /Type /Pages /Kids [%s] /Count %d >>" % (kids, n))
    f1 = page_start + n       # Helvetica
    f2 = f1 + 1               # Helvetica-Bold
    c_start = f2 + 1
    for i in range(n):
        objs.append(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] "
            "/Resources << /Font << /F1 %d 0 R /F2 %d 0 R >> >> "
            "/Contents %d 0 R >>"
            % (int(W), int(H), f1, f2, c_start + i)
        )
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    for i in range(n):
        raw = "\n".join(pages[i]["ops"])
        objs.append("<< /Length %d >>\nstream\n%s\nendstream" % (len(raw.encode("latin-1")), raw))

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, 1):
        offsets.append(len(pdf))
        pdf += ("%d 0 obj\n%s\nendobj\n" % (i, body)).encode("latin-1")
    xref_pos = len(pdf)
    pdf += ("xref\n0 %d\n" % (len(objs) + 1)).encode("latin-1")
    pdf += b"0000000000 65535 f \n"
    for off in offsets:
        pdf += ("%010d 00000 n \n" % off).encode("latin-1")
    pdf += ("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF"
            % (len(objs) + 1, xref_pos)).encode("latin-1")
    return bytes(pdf)


def _handle_health():
    # SECURITY (F-013): don't disclose version/stack in production.
    data = {"status": "healthy", "service": "neural-justice-backend"}
    if not IS_PRODUCTION:
        data["version"] = "1.0.0"
    return _json_response(data)


def _handle_root():
    # SECURITY (F-013): don't disclose version/stack in production.
    data = {"status": "ok", "message": "Neural Justice API is running"}
    if not IS_PRODUCTION:
        data["version"] = "1.0.1-demo-fix"
    return _json_response(data)


def _handle_login(body: dict):
    if not body:
        return _error_response("Request body is required", 400)
    
    username = body.get("username", "")
    password = body.get("password", "")
    
    if not username or not password:
        return _error_response("username and password are required", 400)
    
    # Demo credentials for all roles.
    # SECURITY (F-005): hardcoded admin/admin123/admin and demo/demo are backdoors
    # that bypass the DB password check and grant SUPER_ADMIN. They are now only
    # accepted in non-production when demo login is explicitly enabled.
    hardcoded_demo = (username == "demo" and password == "demo") or \
                     (username == "admin" and password in ("admin123", "admin"))
    is_demo = _demo_bypass_allowed() and hardcoded_demo
    
    if not is_demo:
        conn = get_db()
        try:
            cur = conn.execute("SELECT * FROM user_auth WHERE username = ?", (username,))
            row = cur.fetchone()
            if not row:
                return _error_response("Invalid credentials", 401)
            if not _check_password(password, row["password_hash"]):
                return _error_response("Invalid credentials", 401)
        finally:
            conn.close()
    else:
        # Demo/admin user - use default values
        is_admin = username == "admin"
        row = {
            "username": username,
            "email": f"{username}@neural-justice.gov.in",
            "name": "System Administrator" if is_admin else "Demo Officer",
            "roles": json.dumps(DEFAULT_ROLES),
            "district_id": DEFAULT_DISTRICT_ID,
            "station_id": DEFAULT_STATION_ID,
            "totp_enrolled": 0 if is_admin else 1,  # Skip TOTP for admin
            "totp_secret": None if is_admin else _encrypt_totp_secret("JBSWY3DPEHPK3PXP"),
        }
    
    # For demo, use a fixed TOTP secret that generates predictable codes
    demo_totp_secret = "JBSWY3DPEHPK3PXP"  # Base32 for "demo" - generates same codes
    totp_secret = demo_totp_secret if is_demo else _generate_totp_secret()
    totp_uri = _get_totp_uri(totp_secret, row.get("email", "demo@neural-justice.gov.in"))
    mfa_token = f"mfa-{uuid.uuid4().hex[:24]}"

    _mfa_sessions[mfa_token] = {
        "username": row["username"],
        "user_id": row["username"],
        "totp_secret": totp_secret,
        "totp_enrolled": row.get("totp_enrolled", False),
    }

    roles = json.loads(row["roles"]) if isinstance(row.get("roles"), str) else row.get("roles", DEFAULT_ROLES)
    is_totp_enrolled = row.get("totp_enrolled", False)

    if not is_totp_enrolled:
        # Admin/totp-exempt users: issue token directly (no MFA)
        now = datetime.now(timezone.utc)
        payload = {
            "sub": row["username"],
            "email": row.get("email", "admin@neural-justice.gov.in"),
            "iat": now,
            "exp": now + timedelta(minutes=JWT_EXPIRY_MINUTES),
            "roles": roles,
            "district_id": row.get("district_id", DEFAULT_DISTRICT_ID),
            "station_id": row.get("station_id", DEFAULT_STATION_ID),
            "jurisdiction_type": "state",
        }
        access_token = _create_jwt(payload)
        return _json_response({
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": row["username"],
                "username": row["username"],
                "email": row.get("email", "admin@neural-justice.gov.in"),
                "name": row.get("name", "System Administrator"),
                "roles": roles,
                "district_id": row.get("district_id", DEFAULT_DISTRICT_ID),
                "station_id": row.get("station_id", DEFAULT_STATION_ID),
                "jurisdiction_type": "state",
                "scope_label": "Karnataka State - All Districts",
            },
        })

    return _json_response({
        "mfa_required": True,
        "mfa_token": mfa_token,
        "totp_setup": False,  # TOTP is mandatory, no setup needed
        "totp_secret": None,  # Don't expose secret
        "totp_uri": None,  # Don't expose URI
        "demo_totp_hint": "Use any authenticator app (demo secret is configured server-side)" if is_demo else None,
        "user": {
            "id": row["username"],
            "username": row["username"],
            "email": row.get("email", "demo@neural-justice.gov.in"),
            "name": row.get("name", "Demo Officer"),
            "roles": roles,
            "district_id": row.get("district_id", DEFAULT_DISTRICT_ID),
            "station_id": row.get("station_id", DEFAULT_STATION_ID),
            "jurisdiction_type": "state",
            "scope_label": "Karnataka State - All Districts",
        }
    })


def _handle_verify_mfa(body: dict):
    if not body:
        return _error_response("Request body is required", 400)
    
    mfa_token = body.get("mfa_token", "")
    totp_code = body.get("totp_code", "")
    is_enrollment = body.get("is_enrollment", False)
    
    if not mfa_token or not totp_code:
        return _error_response("mfa_token and totp_code are required", 400)
    
    # Demo credentials (admin/test123) use a special mfa_token that the frontend
    # generates client-side. Treat this as a valid session with the shared demo secret.
    DEMO_MFA_TOKEN = "demo-mfa-token"
    DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP"
    DEMO_USERNAME = "admin"
    
    # SECURITY (F-006): the hardcoded DEMO_MFA_TOKEN ("demo-mfa-token"), the
    # committed 2FA seed (JBSWY3DPEHPK3PXP) and the fixed code "123456" are MFA
    # backdoors. They are only reachable when demo login is enabled in non-prod.
    if mfa_token == DEMO_MFA_TOKEN and _demo_bypass_allowed():
        # For demo users, verify against the shared secret
        # Also accept the fixed fallback code "123456" for demo convenience
        if totp_code != "123456" and not _verify_totp(DEMO_TOTP_SECRET, totp_code, window=1):
            return _error_response("Invalid TOTP code", 401)
        
        # On successful enrollment, store the secret for future verifications
        if is_enrollment:
            _mfa_sessions[DEMO_MFA_TOKEN] = {
                "username": DEMO_USERNAME,
                "user_id": DEMO_USERNAME,
                "totp_secret": DEMO_TOTP_SECRET,
                "totp_enrolled": True,
            }
        
        # Return demo-session sentinel token (frontend expects this for demo mode)
        # This avoids Catalyst's auth middleware rejecting our custom JWT
# For demo users, return 'demo-session' token so frontend treats it as demo
        # and doesn't send Authorization header (avoids Catalyst auth middleware)
        demo_token = "demo-session"
        
        return _json_response({
            "access_token": demo_token,
            "token_type": "bearer",
            "user": {
                "id": DEMO_USERNAME,
                "username": DEMO_USERNAME,
                "email": "admin@neural-justice.gov.in",
                "name": "KSP Officer",
                "roles": ["CP"],
                "district_id": 1,
                "station_id": 1,
                "jurisdiction_type": "state",
                "scope_label": "Karnataka State - All Districts",
            },
        })
    
    session = _mfa_sessions.get(mfa_token)
    if not session:
        return _error_response("Invalid or expired MFA session", 400)

    totp_secret = session.get("totp_secret")
    username = session["username"]

    # If TOTP not enrolled (admin bypass), skip verification
    if not totp_secret or not session.get("totp_enrolled"):
        is_demo = username == "demo"
        _mfa_sessions.pop(mfa_token, None)
        now = datetime.now(timezone.utc)
        payload = {
            "sub": username,
            "email": session.get("user_id", username),
            "iat": now,
            "exp": now + timedelta(minutes=JWT_EXPIRY_MINUTES),
            "roles": DEFAULT_ROLES,
            "district_id": DEFAULT_DISTRICT_ID,
            "station_id": DEFAULT_STATION_ID,
            "jurisdiction_type": "state",
        }
        access_token = _create_jwt(payload)
        return _json_response({
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": username,
                "username": username,
                "email": DEFAULT_EMAIL,
                "name": "Demo Officer" if is_demo else "System Administrator",
                "roles": DEFAULT_ROLES,
                "district_id": DEFAULT_DISTRICT_ID,
                "station_id": DEFAULT_STATION_ID,
                "jurisdiction_type": "state",
                "scope_label": "Karnataka State - All Districts",
            },
        })

    # Replay prevention
    replay_key = f"{username}:{totp_code}"
    if replay_key in _mfa_replay:
        return _error_response("TOTP code already used", 400)
    _mfa_replay[replay_key] = time.time()

    # For demo user, accept a fixed code as well
    is_demo = username == "demo"
    if is_demo:
        if totp_code == "123456" or _verify_totp(totp_secret, totp_code, window=1):
            pass  # Valid demo code
        else:
            return _error_response("Invalid TOTP code. For demo use 123456 or authenticator app with secret JBSWY3DPEHPK3PXP", 401)
    else:
        if not _verify_totp(totp_secret, totp_code, window=1):
            return _error_response("Invalid TOTP code", 401)

    _mfa_sessions.pop(mfa_token, None)

    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "email": session.get("user_id", username),
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRY_MINUTES),
        "roles": DEFAULT_ROLES,
        "district_id": DEFAULT_DISTRICT_ID,
        "station_id": DEFAULT_STATION_ID,
        "jurisdiction_type": "state",
    }
    access_token = _create_jwt(payload)

    return _json_response({
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": username,
            "username": username,
            "email": DEFAULT_EMAIL,
            "name": "Demo Officer" if is_demo else "System Administrator",
            "roles": DEFAULT_ROLES,
            "district_id": DEFAULT_DISTRICT_ID,
            "station_id": DEFAULT_STATION_ID,
            "jurisdiction_type": "state",
            "scope_label": "Karnataka State - All Districts",
        },
    })


# ═══════════════════════════════════════════════════════════════════════
#  AI / QuickML HANDLERS (with real data queries)
# ═══════════════════════════════════════════════════════════════════════

def _get_data_context():
    """Get real data from database for AI context."""
    conn = get_db()
    try:
        # Get recent cases
        cases = conn.execute("SELECT crime_no, crime_type, status, station, district, occurrence_date, brief_facts FROM cases ORDER BY created_at DESC LIMIT 10").fetchall()
        # Get station stats
        stations = conn.execute("SELECT name, code, district, active_cases, solved_rate, officer_count FROM stations WHERE status='active' ORDER BY active_cases DESC LIMIT 10").fetchall()
        # Get crime type distribution
        crime_types = conn.execute("SELECT crime_type, COUNT(*) as count FROM cases GROUP BY crime_type ORDER BY count DESC").fetchall()
        return {
            "recent_cases": [dict(c) for c in cases],
            "top_stations": [dict(s) for s in stations],
            "crime_distribution": [dict(c) for c in crime_types],
        }
    finally:
        conn.close()


def _handle_ai_copilot(body: dict, request=None):
    """POST /api/ai/copilot — single-turn copilot query with real data."""
    user = _get_auth_user(request)
    if not user:
        return _error_response("Authentication required", 401)

    message = (body or {}).get("message", "")
    mode = (body or {}).get("mode", "general")

    if not message:
        return _error_response("message is required", 400)

    # ── Intent pre-check: handle common queries without QuickML ──
    msg_lower = message.lower().strip()

    # 1. Greeting detection — also add blanket match for very short greets
    greeting_patterns = re.compile(r"^(?:hi|hello|hey|good\s*(?:morning|afternoon|evening)|yo|nam(?:aste|askara)?|hii|h(?:e|a)llo|👋|ಹಲೋ|ನಮಸ್ಕಾರ)\b", re.I)
    if greeting_patterns.match(msg_lower) or msg_lower in ("hi", "hello", "hey", "namaste", "namaskara", "yo", "hii", "hlo"):
        return _json_response({
            "response": (
                "Hello! I'm Drishti, your Bengaluru Police Intelligence copilot.\n\n"
                "I can help with:\n"
                "• Crime trend analysis (e.g., 'show crime trends')\n"
                "• Policy recommendations (e.g., 'policy recommendations based on crime')\n"
                "• Suspect lookup (e.g., 'find suspect Kumar')\n"
                "• Hotspot mapping (e.g., 'where are crime hotspots?')\n"
                "• Station performance (e.g., 'how is Nandini Layout station?')\n"
                "• Predictive analysis (e.g., 'predict crime trends')\n"
                "• Victim statistics and more\n\n"
                "What would you like to explore?"
            ),
            "mode": mode,
            "confidence": 1.0,
            "requires_review": False,
            "sources": [],
            "_greeting_handler": True,  # diagnostic: confirms greeting handler code ran
        })

    # 2. Policy recommendations / strategy
    policy_pattern = re.compile(r"policy\s*recommend|recommendation.*crime|crime.*recommend|recommend.*action|strateg|suggest.*(?:crime|action|measure|initiative|policy)", re.I)
    if policy_pattern.search(message):
        data = _get_data_context()
        crime_dist = data.get("crime_distribution", [])
        if crime_dist:
            total = sum(c.get("count", 0) for c in crime_dist)
            lines = [
                "Policy Recommendations Based on Crime Data",
                f"Analysis of {total} total cases across {len(crime_dist)} crime types",
                "",
                "═══════════════════════════════════════════════════",
                "KEY FINDINGS",
                "═══════════════════════════════════════════════════",
            ]
            for r in crime_dist[:5]:
                ct = r.get("crime_type", "N/A")
                c = r.get("count", 0)
                pct = (c / total * 100) if total > 0 else 0
                lines.append(f"  • {ct}: {c} cases ({pct:.1f}%)")

            lines.extend([
                "",
                "═══════════════════════════════════════════════════",
                "RECOMMENDATIONS",
                "═══════════════════════════════════════════════════",
            ])
            for r in crime_dist[:5]:
                ct = r.get("crime_type", "N/A")
                c = r.get("count", 0)
                pct = (c / total * 100) if total > 0 else 0
                if pct >= 10:
                    lines.append(f"  [HIGH] {ct} ({pct:.1f}%) — Allocate specialized units")
                    if any(k in ct.lower() for k in ["death", "murder"]):
                        lines.append("     → Strengthen forensic investigation teams")
                    elif any(k in ct.lower() for k in ["theft", "vehicle"]):
                        lines.append("     → Increase surveillance in hotspots")
                    elif any(k in ct.lower() for k in ["fraud", "cyber", "hacking"]):
                        lines.append("     → Establish dedicated cyber crime units")
                    elif any(k in ct.lower() for k in ["assault", "robbery", "dacoity"]):
                        lines.append("     → Deploy rapid response teams")
                    else:
                        lines.append("     → Allocate dedicated investigation resources")

            lines.extend([
                "",
                "═══════════════════════════════════════════════════",
                "STRATEGIC ACTIONS",
                "═══════════════════════════════════════════════════",
                "  1. Data-driven patrol allocation based on crime patterns",
                "  2. Community policing in high-incident areas",
                "  3. Enhanced inter-agency coordination",
                "  4. Regular training updates for investigating officers",
            ])
            reply = "\n".join(lines)
        else:
            reply = "No crime data available to generate policy recommendations."

        return _json_response({
            "response": reply,
            "mode": mode,
            "confidence": 1.0,
            "requires_review": False,
            "sources": ["ksp_database"],
        })

    # ── General: use QuickML with data context ──
    data = _get_data_context()
    data_summary = f"""
Recent Cases (top 10): {len(data['recent_cases'])} cases
Top Stations by Active Cases: {len(data['top_stations'])} stations
Crime Type Distribution: {len(data['crime_distribution'])} crime types

Sample Cases:
{chr(10).join([f"- {c['crime_no']}: {c['crime_type']} at {c['station']} ({c['status']})" for c in data['recent_cases'][:5]])}

Top Stations:
{chr(10).join([f"- {s['name']} ({s['code']}): {s['active_cases']} active, {s['solved_rate']}% solved" for s in data['top_stations'][:5]])}

Crime Distribution:
{chr(10).join([f"- {c['crime_type']}: {c['count']} cases" for c in data['crime_distribution'][:5]])}
"""

    messages = [
        {"role": "system", "content": f"You are Neural Justice AI, a police intelligence copilot for Karnataka State Police. Mode: {mode}. Use the provided real KSP data to give concise, actionable insights. Data context:\n{data_summary}"},
        {"role": "user", "content": message},
    ]

    response_text = _call_quickml(messages)
    if response_text is None:
        return _json_response({
            "response": f"Based on KSP data: {data_summary[:500]}... (AI service unavailable, showing data summary)",
            "mode": mode,
            "confidence": 0.7,
            "requires_review": True,
            "sources": ["ksp_database"],
        }, 503)

    return _json_response({
        "response": response_text,
        "mode": mode,
        "confidence": 0.85,
        "requires_review": False,
        "sources": ["ksp_database", "quickml"],
    })


def _handle_ai_copilot_chat(body: dict, request=None):
    """POST /api/ai/copilot/chat — multi-turn chat with real data context."""
    user = _get_auth_user(request)
    if not user:
        return _error_response("Authentication required", 401)

    messages = (body or {}).get("messages", [])
    lang = (body or {}).get("language", "en")

    if not messages:
        return _error_response("messages are required", 400)

    # ── Extract the last user message for pre-checks ──
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = m.get("content", "").strip()
            break

    # ── Greeting handler ──
    if last_user_msg:
        greeting_match = re.match(
            r"^(?:hi|hello|hey|good\s*(?:morning|afternoon|evening)|yo|nam(?:aste|askara)?|hii|h(?:e|a)llo|👋|ಹಲೋ|ನಮಸ್ಕಾರ)\b",
            last_user_msg, re.I
        )
        if greeting_match or last_user_msg.lower() in ("hi", "hello", "hey", "namaste", "namaskara", "yo", "hii", "hlo"):
            return _json_response({
                "response": (
                    "Hello! I'm Drishti, your Bengaluru Police Intelligence copilot.\n\n"
                    "I can help with:\n"
                    "• Crime trend analysis (e.g., 'show crime trends')\n"
                    "• Policy recommendations (e.g., 'policy recommendations based on crime')\n"
                    "• Suspect lookup (e.g., 'find suspect Kumar')\n"
                    "• Hotspot mapping (e.g., 'where are crime hotspots?')\n"
                    "• Station performance (e.g., 'how is Nandini Layout station?')\n"
                    "• Predictive analysis (e.g., 'predict crime trends')\n"
                    "• Victim statistics and more\n\n"
                    "What would you like to explore?"
                ),
                "confidence": 1.0,
                "_greeting_handler": True,
            })

    # ── Policy recommendations handler ──
    if last_user_msg and re.search(
        r"policy\s*recommend|recommendation.*crime|crime.*recommend|recommend.*action|strateg|suggest.*(?:crime|action|measure|initiative|policy)",
        last_user_msg, re.I
    ):
        data = _get_data_context()
        crime_dist = data.get("crime_distribution", [])
        if crime_dist:
            total = sum(c.get("count", 0) for c in crime_dist)
            lines = [
                "Policy Recommendations Based on Crime Data",
                f"Analysis of {total} total cases across {len(crime_dist)} crime types",
                "",
                "═══════════════════════════════════════════════════",
                "KEY FINDINGS",
                "═══════════════════════════════════════════════════",
            ]
            for r in crime_dist[:5]:
                ct = r.get("crime_type", "N/A")
                c = r.get("count", 0)
                pct = (c / total * 100) if total > 0 else 0
                lines.append(f"  • {ct}: {c} cases ({pct:.1f}%)")

            lines.extend([
                "",
                "═══════════════════════════════════════════════════",
                "RECOMMENDATIONS",
                "═══════════════════════════════════════════════════",
            ])
            for r in crime_dist[:5]:
                ct = r.get("crime_type", "N/A")
                c = r.get("count", 0)
                pct = (c / total * 100) if total > 0 else 0
                if pct >= 10:
                    lines.append(f"  [HIGH] {ct} ({pct:.1f}%) — Allocate specialized units")
                    if any(k in ct.lower() for k in ["death", "murder"]):
                        lines.append("     → Strengthen forensic investigation teams")
                    elif any(k in ct.lower() for k in ["theft", "vehicle"]):
                        lines.append("     → Increase surveillance in hotspots")
                    elif any(k in ct.lower() for k in ["fraud", "cyber", "hacking"]):
                        lines.append("     → Establish dedicated cyber crime units")
                    elif any(k in ct.lower() for k in ["assault", "robbery", "dacoity"]):
                        lines.append("     → Deploy rapid response teams")
                    else:
                        lines.append("     → Allocate dedicated investigation resources")

            lines.extend([
                "",
                "═══════════════════════════════════════════════════",
                "STRATEGIC ACTIONS",
                "═══════════════════════════════════════════════════",
                "  1. Data-driven patrol allocation based on crime patterns",
                "  2. Community policing programs in high-incident areas",
                "  3. Enhanced inter-agency coordination for cross-border crimes",
            ])

            return _json_response({
                "response": "\n".join(lines),
                "confidence": 1.0,
            })

    # ── Case timeline handler (bounded, never LLM — mirrors /api/copilot/chat) ──
    if last_user_msg and re.search(
        r"road\s*map|roadmap|timeline|history\s+of\s+this\s+case|case\s+history|"
        r"what\s+(?:was\s+)?happened|what\s+happened|ಕಾಲರೇಖೆ|ಇತಿಹಾಸ|ಟೈಮ್ಲಾಯಿನ್",
        last_user_msg, re.I
    ):
        case_id = _extract_case_id(last_user_msg)
        if not case_id:
            return _json_response({
                "response": (
                    "I can build a case timeline, but I need the crime number. "
                    "Example: 'give me a timeline for CR-2026-49637'."
                ),
                "confidence": 0.0,
                "clarification_needed": True,
            })
        user_info = _get_auth_user_or_demo(request) or {}
        evidence, rows = _fetch_case_timeline(
            case_id,
            user_info.get("station_id"),
            user_info.get("district_id"),
        )
        return _json_response({
            "response": _format_case_timeline(rows),
            "confidence": 1.0,
            "intent_detected": "case_timeline",
            "query_evidence": evidence,
            "clarification_needed": False,
        })

    # Get real data context
    data = _get_data_context()
    data_summary = f"""
KSP Database Context:
- {len(data['recent_cases'])} recent cases
- {len(data['top_stations'])} active stations
- Crime types: {', '.join([c['crime_type'] for c in data['crime_distribution'][:5]])}
"""

    # Master-prompt rule: MOCK_AI=true is an explicit ERROR STATE, never a
    # silent mock fallback. Grounded data handlers above still work.
    if os.environ.get("MOCK_AI", "false").lower() in ("1", "true", "yes"):
        return _json_response({
            "response": (
                "AI generation is currently unavailable: the deployment is in "
                "MOCK_AI=true state (no real model configured). Set MOCK_AI=false "
                "and configure QuickML credentials to enable AI responses."
            ),
            "confidence": 0.0,
            "ai_state": "mock_disabled_error",
        }, 503)

    system_msg = {"role": "system", "content": f"You are Neural Justice AI, a police intelligence copilot for Karnataka State Police. Respond in {'Kannada (ಕನ್ನಡ)' if lang == 'kn' else 'English'}. Use real data:\n{data_summary}"}
    full_messages = [system_msg] + messages

    response_text = _call_quickml(full_messages)
    if response_text is None:
        return _json_response({
            "response": f"Data summary: {data_summary} (AI unavailable)",
        }, 503)

    return _json_response({
        "response": response_text,
        "confidence": 0.85,
    })


def _handle_ai_query(body: dict, request=None):
    """POST /api/ai/query — legacy query endpoint."""
    user = _get_auth_user(request)
    if not user:
        return _error_response("Authentication required", 401)

    query = (body or {}).get("query", "")
    mode = (body or {}).get("mode", "general")

    if not query:
        return _error_response("query is required", 400)

    # ── Greeting handler ──
    greeting_match = re.match(
        r"^(?:hi|hello|hey|good\s*(?:morning|afternoon|evening)|yo|nam|hii|hlo|👋|ಹಲೋ|ನಮಸ್ಕಾರ)\b",
        query.strip(), re.I
    )
    if greeting_match:
        return _json_response({
            "response": "Hello! I'm Drishti, your Bengaluru Police Intelligence copilot. I can help with:\n• Crime trend analysis (e.g., 'show crime trends')\n• Policy recommendations (e.g., 'policy recommendations based on crime')\n• Suspect lookup (e.g., 'find suspect Kumar')\n• Hotspot mapping (e.g., 'where are crime hotspots?')\n• Station performance (e.g., 'how is Nandini Layout station?')\n• Predictive analysis (e.g., 'predict crime trends')\n• Victim statistics and more\n\nWhat would you like to explore?",
            "confidence": 1.0,
            "status": "success",
            "sources": [],
            "_greeting_handler": True,
        })

    # ── Policy recommendations handler ──
    policy_match = re.search(
        r"policy\s*recommend|recommendation.*crime|crime.*recommend|policy.*crime|recommend.*action|strateg|suggest.*(?:crime|action|measure|initiative)",
        query, re.I
    )
    if policy_match:
        # Get crime distribution for data-driven recommendations
        try:
            conn = get_db()
            try:
                rows = conn.execute("""
                    SELECT crime_type, COUNT(*) as count
                    FROM cases
                    WHERE crime_type IS NOT NULL AND crime_type != ''
                    GROUP BY crime_type
                    ORDER BY count DESC
                    LIMIT 10
                """).fetchall()
                if rows:
                    total = sum(r["count"] for r in rows)
                    top = rows[:5]
                    rec_lines = [
                        "📊 **Policy Recommendations Based on Crime Data**",
                        f"Analysis of {total} cases across {len(rows)} crime types",
                        "",
                        "**Key Findings:**",
                    ]
                    for r in top:
                        pct = (r["count"] / total * 100) if total > 0 else 0
                        rec_lines.append(f"• {r['crime_type']}: {r['count']} cases ({pct:.1f}%)")

                    rec_lines.extend([
                        "",
                        "**Recommendations:**",
                    ])
                    for r in top:
                        pct = (r["count"] / total * 100) if total > 0 else 0
                        if pct >= 10:
                            ct = r["crime_type"].lower()
                            rec_lines.append(f"🔴 **HIGH PRIORITY — {r['crime_type']} ({pct:.1f}%)**")
                            if "theft" in ct or "vehicle" in ct:
                                rec_lines.append("   → Increase surveillance in hotspots")
                                rec_lines.append("   → Launch public awareness campaigns")
                            elif "fraud" in ct or "cyber" in ct:
                                rec_lines.append("   → Strengthen cyber crime units")
                                rec_lines.append("   → Conduct digital literacy programs")
                            elif "assault" in ct or "robbery" in ct:
                                rec_lines.append("   → Deploy rapid response teams")
                                rec_lines.append("   → Increase night patrols in affected areas")
                            else:
                                rec_lines.append("   → Allocate dedicated investigation resources")
                                rec_lines.append("   → Implement targeted prevention programs")

                    rec_lines.extend([
                        "",
                        "**Strategic Actions:**",
                        "1. Data-driven patrol allocation based on crime patterns",
                        "2. Community policing programs in high-incident areas",
                        "3. Enhanced inter-agency coordination for cross-border crimes",
                    ])

                    return _json_response({
                        "response": "\n".join(rec_lines),
                        "confidence": 0.95,
                        "status": "success",
                        "sources": ["cases_table"],
                    })
            finally:
                conn.close()
        except Exception as e:
            logger.error("Policy recommendations query failed: %s", e)

    messages = [
        {"role": "system", "content": f"You are Neural Justice AI, a police intelligence copilot for Karnataka State Police. Mode: {mode}. Provide concise, actionable insights."},
        {"role": "user", "content": query},
    ]

    response_text = _call_quickml(messages)
    if response_text is None:
        return _json_response({
            "response": "AI service is currently unavailable. Please try again later.",
            "status": "error",
        }, 503)

    return _json_response({
        "response": response_text,
        "confidence": 0.85,
        "status": "success",
        "sources": [],
    })


def _handle_ai_sessions(body: dict, request=None):
    """GET /api/ai/sessions — list copilot sessions (stub)."""
    user = _get_auth_user(request)
    if not user:
        return _error_response("Authentication required", 401)
    return _json_response([])


def _handle_ai_session_messages(session_id: str, body: dict, request=None, method: str = "GET"):
    """GET/POST /api/ai/sessions/{id}/messages."""
    user = _get_auth_user(request)
    if not user:
        return _error_response("Authentication required", 401)

    if method == "GET":
        return _json_response({"session_id": session_id, "messages": []})
    else:
        return _json_response({"id": f"msg-{uuid.uuid4().hex[:12]}", "role": "assistant", "content": "Message received."})


# ═══════════════════════════════════════════════════════════════════════
#  NEW COPILOT MODULE — intent classification, SQL queries, table responses
# ═══════════════════════════════════════════════════════════════════════

# ── Intent Enum ─────────────────────────────────────────────────────
_COPILOT_INTENTS = {
    "crime_trends": "crime_trends",
    "hotspot": "hotspot",
    "suspect_lookup": "suspect_lookup",
    "victim_stats": "victim_stats",
    "station_performance": "station_performance",
    "officer_assignment": "officer_assignment",
    "general_chat": "general_chat",
    "predictive": "predictive",
}

# ── Intent Classification Patterns ──────────────────────────────────
# Each: (compiled_regex, intent_key, base_confidence)
_COPILOT_PATTERNS = [
    # crime_trends
    (re.compile(r"crime\s*trend|crime\s*pattern|trend.*crime|ಅಪರಾಧ|ಪ್ರವೃತ್ತಿ", re.I), "crime_trends", 0.90),
    (re.compile(r"(?:show|display|list).*trend", re.I), "crime_trends", 0.80),
    (re.compile(r"(?:how\s+many|number\s+of)\s+(?:cases?|crimes?|fir)", re.I), "crime_trends", 0.75),
    (re.compile(r"(?:city|bengaluru|bangalore).*(?:summary|overview|intelligence|crime)", re.I), "crime_trends", 0.85),
    (re.compile(r"(?:summary|overview|intelligence).*(?:crime|city|bengaluru)", re.I), "crime_trends", 0.85),
    (re.compile(r"crime.*(?:data|stats|statistics)", re.I), "crime_trends", 0.80),
    (re.compile(r"i\s+need.*(?:bengaluru|bangalore)", re.I), "crime_trends", 0.75),

    # policy_recommendations
    (re.compile(r"policy\s*recommend|recommendation.*crime|crime.*recommend|policy.*crime|suggest.*(?:crime|action|measure|initiative)|recommend.*action|strateg", re.I), "policy_recommendations", 0.90),

    # hotspot
    (re.compile(r"hot\s*spot| hotspot | hotspot$|^hotspot|ಹಾಟ್\u200cಸ್ಪಾಟ್", re.I), "hotspot", 0.90),
    (re.compile(r"where.*(?:most|high|cluster|concentration)", re.I), "hotspot", 0.80),
    (re.compile(r"(?:top|high)\s+(?:crime|incident)\s+(?:areas?|locations?|zones?)", re.I), "hotspot", 0.85),

    # predictive
    (re.compile(r"predict|forecast|future|next\s+\d+\s+days|prediction", re.I), "predictive", 0.90),
    (re.compile(r"predictive\s+policing|crime\s+forecast|risk\s+forecast", re.I), "predictive", 0.95),

    # suspect_lookup
    (re.compile(r"suspect\s+([A-Z][\w\s]{1,30})", re.I), "suspect_lookup", 0.85),
    (re.compile(r"suspect|accused|ಆರೋಪಿ|shakki|sandiga", re.I), "suspect_lookup", 0.85),
    (re.compile(r"(?:search|look\s*up|find)\s+([A-Z][\w\s]{1,30})", re.I), "suspect_lookup", 0.75),

    # victim_stats
    (re.compile(r"victim|ಸಂತ್ರಸ್ತ", re.I), "victim_stats", 0.85),
    (re.compile(r"(?:victim).*(?:demo|stat|count|number)", re.I), "victim_stats", 0.90),

    # station_performance
    (re.compile(r"station\s*performance|station.*(?:doing|status|report)|\u0caa\u0cca\u0cb2\u0cc0\u0cb8\u0ccd\u200c\u0cb8\u0ccd\u0c9f\u0cc7\u0cb7\u0ca8\u0ccd", re.I), "station_performance", 0.90),
    (re.compile(r"(?:how\s+is|status\s+of)\s+(?:station|ps)\s+(\w[\w\s]{0,20})", re.I), "station_performance", 0.80),
    (re.compile(r"(?:how\s+is|status\s+of)\s+(\w[\w\s]{0,20})\s+station", re.I), "station_performance", 0.80),
    (re.compile(r"station\s+(\w[\w\s]{0,20})", re.I), "station_performance", 0.70),
    (re.compile(r"(\w[\w\s]{0,20})\s+station\s*(?:performance|status|doing)", re.I), "station_performance", 0.85),

    # officer_assignment
    (re.compile(r"officer\s*assignment|who.*assigned|assigned\s*officer|\u0ca8\u0cc7\u0cae\u0c95", re.I), "officer_assignment", 0.85),
    (re.compile(r"assigned\s*cases?|cases?\s*assigned|my\s*cases?|my\s*assigned", re.I), "officer_assignment", 0.85),
    (re.compile(r"what.*cases?.*(?:for\s+me|assigned\s+to)", re.I), "officer_assignment", 0.80),
    # Typo-tolerant / synonym coverage: "case assignments", "assiended cases",
    # "cases for me", "my workload", "allotted/allocated/given to me".
    (re.compile(r"case\s*assignments?|assignment\s*of\s*cases", re.I), "officer_assignment", 0.88),
    (re.compile(r"ass[a-z]*ed\s*cases?|cases?\s*(?:assigned|allotted|allocated|given|for\s+me)", re.I), "officer_assignment", 0.85),
    (re.compile(r"my\s*(?:cases?|assignments?|workload|caseload)", re.I), "officer_assignment", 0.85),
    (re.compile(r"(?:show|list|view|see)\s*assignments?", re.I), "officer_assignment", 0.82),

    # case_timeline — roadmap / timeline / what happened / history (EN + KN)
    # Placed after officer_assignment but with higher base confidence so
    # timeline phrasings outrank generic case lookups.
    (re.compile(r"road\s*map|roadmap", re.I), "case_timeline", 0.93),
    (re.compile(r"timeline|history\s+of\s+this\s+case|case\s+history|\u0c95\u0cbe\u0cb2\u0cb0\u0cc7\u0c96\u0cc6|\u0c87\u0ca4\u0cbf\u0cb9\u0cbe\u0cb8|\u0c9f\u0cc8\u0cae\u0ccd\u0cb2\u0cbe\u0caf\u0cbf\u0ca8\u0ccd|\u0c9f\u0cc8\u0cae\u0ccd\u200c\u0cb2\u0cc8\u0ca8\u0ccd", re.I), "case_timeline", 0.92),
    (re.compile(r"what\s+(?:was\s+)?happened|what\s+happened|what\s+went\s+down|\u0c8f\u0ca8\u0cbe\u0caf\u0cbf\u0ca4\u0cc1|\u0c8f\u0ca8\u0cc1\s+\u0c86\u0caf\u0ccd\u0ca4\u0cc1", re.I), "case_timeline", 0.90),
    (re.compile(r"case\s*(?:timeline|roadmap|history|events|sequence|chronology)", re.I), "case_timeline", 0.92),
    (re.compile(r"(?:roadmap|timeline|what\s+happened|history|events?|summary|status|details).{0,40}?([A-Z]{1,4}[-/]?\d{4}[-/]?\d{1,10}|[0-9]{10,20})", re.I), "case_timeline", 0.91),
    (re.compile(r"([A-Z]{1,4}[-/]?\d{4}[-/]?\d{1,10}|[0-9]{10,20}).{0,40}?(?:roadmap|timeline|what\s+happened|history|events?|summary|details)", re.I), "case_timeline", 0.91),

    # financial_intelligence — suspicious transaction report (EN + KN).
    # Bounded, data-only intent: never reaches the LLM / MOCK_AI guard.
    (re.compile(r"financial\s*intelligence|suspicious\s*transaction|money\s*trail|anomalous\s*transaction|ಹಣಕಾಸು\s*ಗುಪ್ತಚರ|ಅನುಮಾನಾಸ್ಪದ\s*ವಹಿವಾಟು|ವಹಿವಾಟು\s*ವರದಿ", re.I), "financial_intelligence", 0.92),

    # risk_score → refused: individual risk scoring was removed from the platform.
    # The pattern is kept as a hard gate so these queries NEVER reach the LLM
    # (a real model could otherwise fabricate risk assessments). Bounded, data-less.
    (re.compile(r"risk\s*score|risk\s*rating|risk\s*level|ಅಪಾಯ.*ಸ್ಕೋರ್", re.I), "risk_score_denied", 0.85),
    (re.compile(r"accused.*risk|risk.*accused", re.I), "risk_score_denied", 0.80),
    (re.compile(r"(?:what\s+is|show|get|check)\s+(?:the\s+)?risk\s+(?:score|rating|level)\s+(?:for|of)\s+(.+?)(?:\?|$)", re.I), "risk_score_denied", 0.80),
]

_CONFIDENCE_THRESHOLD = 0.6

def _classify_copilot_intent(text: str) -> tuple:
    """Classify user intent using rule-based patterns.
    Returns: (intent_key, confidence, entities_dict)
    """
    text_clean = text.strip()
    if not text_clean:
        return "general_chat", 0.0, {}

    scores = {}
    for pattern, intent_key, base_conf in _COPILOT_PATTERNS:
        match = pattern.search(text_clean)
        if match:
            match_ratio = len(match.group(0)) / max(len(text_clean), 1)
            conf = min(base_conf + match_ratio * 0.1, 1.0)
            if intent_key not in scores or conf > scores[intent_key]:
                scores[intent_key] = conf

    if not scores:
        return "general_chat", 0.3, {}

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_intent, top_conf = ranked[0]

    if len(ranked) >= 2:
        second_conf = ranked[1][1]
        if top_conf - second_conf < 0.15 and top_conf < 0.9:
            return "general_chat", top_conf * 0.8, {}

    return top_intent, top_conf, {}


# ── SQL Query Templates (adapted to Catalyst table schemas) ────────
_COPILOT_QUERIES = {
    "crime_trends": """
        SELECT crime_type, COUNT(*) as count
        FROM cases
        WHERE crime_type IS NOT NULL AND crime_type != ''
        GROUP BY crime_type
        ORDER BY count DESC
    """,
    "hotspot": """
        SELECT station, district, COUNT(*) as case_count
        FROM cases
        WHERE station IS NOT NULL
        GROUP BY station, district
        ORDER BY case_count DESC
        LIMIT 10
    """,
    "suspect_lookup": """
        SELECT name, age, gender, case_count, modus_operandi, crime_types
        FROM criminal_profiles
        WHERE name LIKE ?
        ORDER BY case_count DESC
        LIMIT 10
    """,
    "victim_stats": """
        SELECT victim_name, crime_type, station, district
        FROM cases
        WHERE victim_name IS NOT NULL AND victim_name != ''
    """,
    "station_performance": """
        SELECT name, code, district, active_cases, solved_rate, officer_count, status
        FROM stations
        WHERE name LIKE ?
        LIMIT 5
    """,
    "officer_assignment": """
        SELECT crime_no, crime_type, station, district, status, accused_names
        FROM cases
        ORDER BY created_at DESC
        LIMIT 10
    """,
    "predictive": """
        SELECT crime_type, COUNT(*) as count
        FROM cases
        WHERE crime_type IS NOT NULL AND crime_type != ''
        GROUP BY crime_type
        ORDER BY count DESC
    """,
    "policy_recommendations": """
        SELECT crime_type, COUNT(*) as count
        FROM cases
        WHERE crime_type IS NOT NULL AND crime_type != ''
        GROUP BY crime_type
        ORDER BY count DESC
    """,
}


# ── Response Formatters (professional table output) ────────────────
def _format_crime_trends(rows):
    if not rows:
        return "No crime trend data available. Try asking about a specific area."
    total = sum(r.get("count", 0) for r in rows)
    lines = [
        "Crime Intelligence Summary",
        f"Total Cases: {total} | Crime Types: {len(rows)}",
        "",
        "Crime Type        Cases     % Share",
        "──────────────────────────────────────",
    ]
    for r in rows[:8]:
        ct = r.get("crime_type", "N/A")
        c = r.get("count", 0)
        pct = (c / total * 100) if total > 0 else 0
        bar = "█" * min(c, 15)
        lines.append(f"{ct:<17} {c:<9} {pct:.1f}%     {bar}")
    if rows:
        top = rows[0]
        lines.extend(["", f"Most common: {top.get('crime_type', 'N/A')} ({top.get('count', 0)} cases)", ""])
    lines.append("Tip: Ask about a specific area for area-wise trends.")
    return "\n".join(lines)


def _format_hotspot(rows):
    if not rows:
        return "No hotspot data available."
    lines = [
        f"Crime Hotspots ({len(rows)} locations)",
        "",
        "Station           District        Cases     Heat Level",
        "────────────────────────────────────────────────────────",
    ]
    for r in rows:
        station = r.get("station", "N/A")
        district = r.get("district", "N/A")
        case_count = r.get("case_count", 0)
        heat = "HIGH" if case_count >= 5 else ("MEDIUM" if case_count >= 2 else "LOW")
        lines.append(f"{station:<18} {district:<16} {case_count:<9} {heat}")
    return "\n".join(lines)


def _format_suspect(rows):
    if not rows:
        return "No suspect records found."
    lines = [
        f"Suspect Records ({len(rows)} found)",
        "",
        "Name            Age   Gender   Cases   Modus Operandi",
        "──────────────────────────────────────────────────────",
    ]
    for r in rows:
        name = r.get("name", "N/A")
        age = r.get("age", "N/A")
        gender = r.get("gender", "N/A")
        cases = r.get("case_count", 0)
        mo = (r.get("modus_operandi") or "")[:25]
        lines.append(f"{name:<15} {str(age):<5} {gender:<7} {cases:<6} {mo}")
    return "\n".join(lines)


def _format_station(rows):
    if not rows:
        return "No station data found."
    lines = [
        f"Station Performance ({len(rows)} stations)",
        "",
        "Station           District        Active Cases  Solved Rate  Officers",
        "──────────────────────────────────────────────────────────────────────",
    ]
    for r in rows:
        name = r.get("name", "N/A")
        district = r.get("district", "N/A")
        active = r.get("active_cases", 0)
        solved = r.get("solved_rate", 0)
        officers = r.get("officer_count", 0)
        lines.append(f"{name:<18} {district:<16} {active:<13} {solved:<7.1f}%   {officers}")
    return "\n".join(lines)


def _format_officer_assignment(rows):
    if not rows:
        return "No assigned cases found."
    open_count = sum(1 for r in rows if r.get("status", "").lower() == "open")
    closed_count = sum(1 for r in rows if r.get("status", "").lower() == "closed")
    lines = [
        f"Case Assignments ({len(rows)} records) — Open: {open_count} | Closed: {closed_count}",
        "",
        "Case No          Crime Type      Station         Status   Accused",
        "──────────────────────────────────────────────────────────────────",
    ]
    for r in rows:
        cn = r.get("crime_no", "N/A")
        ct = r.get("crime_type", "N/A")
        st = r.get("station", "N/A")
        status = r.get("status", "N/A")
        accused = (r.get("accused_names") or "")[:20]
        lines.append(f"{cn:<17} {ct:<15} {st:<15} {status:<8} {accused}")
    return "\n".join(lines)


def _format_victim_stats(rows):
    if not rows:
        return "No victim data available."
    lines = [
        f"Victim Records ({len(rows)} found)",
        "",
        "Victim Name       Crime Type      Station         District",
        "───────────────────────────────────────────────────────────",
    ]
    for r in rows:
        vn = (r.get("victim_name") or "N/A")[:20]
        ct = r.get("crime_type", "N/A")
        st = r.get("station", "N/A")
        dist = r.get("district", "N/A")
        lines.append(f"{vn:<17} {ct:<15} {st:<15} {dist}")
    return "\n".join(lines)


def _format_predictive(rows):
    if not rows:
        return "No data available for predictive analysis."
    total = sum(r.get("count", 0) for r in rows)
    lines = [
        "Predictive Policing Insights — Next 30 Days",
        f"Based on {total} current cases across {len(rows)} crime types",
        "",
        "Projected Risk Areas:",
        "─────────────────────────────────────────────────",
    ]
    for r in rows[:5]:
        ct = r.get("crime_type", "N/A")
        c = r.get("count", 0)
        pct = (c / total * 100) if total > 0 else 0
        risk = "HIGH" if pct >= 30 else ("MEDIUM" if pct >= 15 else "LOW")
        pred = f"Expected increase of {int(c * 1.2)} cases" if pct >= 30 else (f"Stable at ~{c} cases" if pct >= 15 else "Minimal change expected")
        lines.append(f"  {ct:<15} {risk:<8} {pred}")
    lines.extend([
        "",
        "Recommended Actions:",
        "─────────────────────────────────────────────────",
        f"  1. Increase patrols in areas with top crime types",
        "  2. Focus on prevention for highest-volume crimes",
        "  3. Monitor repeat offender patterns",
    ])
    return "\n".join(lines)


def _format_policy_recommendations(rows):
    """Generate policy recommendations based on actual crime data."""
    if not rows:
        return "No crime data available to generate policy recommendations."
    
    total = sum(r.get("count", 0) for r in rows)
    top_crimes = rows[:5]
    
    lines = [
        "Policy Recommendations Based on Crime Data",
        f"Analysis of {total} total cases across {len(rows)} crime types",
        "",
        "═══════════════════════════════════════════════════",
        "KEY FINDINGS",
        "═══════════════════════════════════════════════════",
    ]
    
    for r in top_crimes:
        ct = r.get("crime_type", "N/A")
        c = r.get("count", 0)
        pct = (c / total * 100) if total > 0 else 0
        lines.append(f"  • {ct}: {c} cases ({pct:.1f}%)")
    
    lines.extend([
        "",
        "═══════════════════════════════════════════════════",
        "RECOMMENDATIONS",
        "═══════════════════════════════════════════════════",
    ])
    
    # Generate recommendations based on data patterns
    for r in top_crimes:
        ct = r.get("crime_type", "N/A")
        c = r.get("count", 0)
        pct = (c / total * 100) if total > 0 else 0
        
        if pct >= 10:
            lines.append(f"  🔴 HIGH PRIORITY — {ct} ({pct:.1f}%)")
            if "death" in ct.lower() or "murder" in ct.lower():
                lines.append(f"     → Strengthen forensic investigation units")
                lines.append(f"     → Deploy additional crime scene teams")
            elif "theft" in ct.lower() or "vehicle" in ct.lower():
                lines.append(f"     → Increase surveillance in hotspots")
                lines.append(f"     → Launch public awareness campaigns")
            elif "fraud" in ct.lower() or "cyber" in ct.lower() or "hacking" in ct.lower():
                lines.append(f"     → Establish dedicated cyber crime units")
                lines.append(f"     → Conduct digital literacy programs")
            elif "assault" in ct.lower() or "robbery" in ct.lower() or "dacoity" in ct.lower():
                lines.append(f"     → Deploy rapid response teams")
                lines.append(f"     → Increase night patrols in affected areas")
            elif "breach" in ct.lower() or "financial" in ct.lower():
                lines.append(f"     → Strengthen financial crime investigation")
                lines.append(f"     → Coordinate with banking institutions")
            else:
                lines.append(f"     → Allocate dedicated investigation resources")
                lines.append(f"     → Implement targeted prevention programs")
    
    lines.extend([
        "",
        "═══════════════════════════════════════════════════",
        "STRATEGIC ACTIONS",
        "═══════════════════════════════════════════════════",
        "  1. Data-driven patrol allocation based on crime patterns",
        "  2. Community policing programs in high-incident areas",
        "  3. Enhanced inter-agency coordination for cross-border crimes",
        "  4. Regular training updates for investigating officers",
        "  5. Public reporting mechanisms to improve crime data quality",
        "",
        "Note: Recommendations are generated based on current crime data patterns.",
        "Regular review and adjustment of strategies is recommended.",
    ])
    
    return "\n".join(lines)


def _fetch_case_timeline(case_id: str, station_id=None, district_id=None):
    """Stage 2 — multi-source joined fetch for case timeline (deployed mirror).

    Schema-verifies each table, applies station/district jurisdiction to the
    master case lookup, and refuses to return related records for cases that
    fall outside the caller's jurisdiction (RBAC gate).

    Returns (evidence_list, merged_rows) where each row is tagged _source.
    """
    evidence = []
    merged = []
    like = f"%{case_id.strip().upper()}%"

    try:
        conn = get_db()
        try:
            def _cols(table):
                return [r[1] for r in conn.execute(f"PRAGMA table_info({table})")]

            # 1. Master case record (jurisdiction-scoped)
            cases_cols = _cols("cases")
            if "crime_no" not in cases_cols:
                evidence.append({"source_table": "cases", "row_count": 0,
                                 "filters_applied": {"error": "cases.crime_no column missing"}})
                return evidence, []
            scope_sql = ""
            if station_id:
                scope_sql = " AND station IN (SELECT name FROM stations WHERE id = ?)"
            elif district_id:
                scope_sql = " AND district IN (SELECT name FROM districts WHERE id = ?)"
            params = [like] + ([int(station_id)] if station_id else [int(district_id)] if district_id else [])
            case_rows = [dict(r) for r in conn.execute(
                f"SELECT * FROM cases WHERE crime_no LIKE ?{scope_sql}", params).fetchall()]
            evidence.append({"source_table": "cases", "row_count": len(case_rows),
                             "filters_applied": {"crime_no_like": like}})
            for r in case_rows:
                r["_source"] = "cases"
                merged.append(r)

            # RBAC gate — out-of-scope case: never leak related records
            if (station_id or district_id) and not case_rows:
                evidence.append({"source_table": "activity", "row_count": 0,
                                 "filters_applied": {"blocked_by_jurisdiction": "station" if station_id else "district"}})
                return evidence, merged

            # 2. Activity events
            if "entity_id" in _cols("activity"):
                act_rows = [dict(r) for r in conn.execute(
                    "SELECT * FROM activity WHERE entity_id LIKE ?", (like,)).fetchall()]
                evidence.append({"source_table": "activity", "row_count": len(act_rows),
                                 "filters_applied": {"entity_id_like": like}})
                for r in act_rows:
                    r["_source"] = "activity"
                    merged.append(r)
            else:
                evidence.append({"source_table": "activity", "row_count": 0,
                                 "filters_applied": {"error": "activity.entity_id column missing"}})

            # 3. Orders referencing the case
            if "title" in _cols("orders"):
                ord_rows = [dict(r) for r in conn.execute(
                    "SELECT * FROM orders WHERE title LIKE ? OR description LIKE ?", (like, like)).fetchall()]
                evidence.append({"source_table": "orders", "row_count": len(ord_rows),
                                 "filters_applied": {"title_or_description_like": like}})
                for r in ord_rows:
                    r["_source"] = "orders"
                    merged.append(r)
            else:
                evidence.append({"source_table": "orders", "row_count": 0,
                                 "filters_applied": {"error": "orders table missing"}})

            # 4. Notifications referencing the case
            if "title" in _cols("notifications"):
                n_rows = [dict(r) for r in conn.execute(
                    "SELECT * FROM notifications WHERE title LIKE ? OR message LIKE ?", (like, like)).fetchall()]
                evidence.append({"source_table": "notifications", "row_count": len(n_rows),
                                 "filters_applied": {"title_or_message_like": like}})
                for r in n_rows:
                    r["_source"] = "notifications"
                    merged.append(r)
            else:
                evidence.append({"source_table": "notifications", "row_count": 0,
                                 "filters_applied": {"error": "notifications table missing"}})
        finally:
            conn.close()
    except Exception as e:
        logger.error("Timeline fetch failed: %s", e)
        evidence.append({"source_table": "cases", "row_count": 0,
                         "filters_applied": {"error": str(e)[:200]}})
    return evidence, merged


def _format_case_timeline(rows):
    """Stage 3 — deterministic, factual chronology (deployed mirror).

    Rendered as GFM tables so the frontend Markdown renderer displays a
    real HTML table. Every cell is grounded in a real column value; absent
    data is stated as "Not recorded". Never invents events, never predicts,
    never characterizes individuals.
    """
    if not rows:
        return (
            "No case timeline found for that crime number in the platform database. "
            "Case timelines can only be built from recorded FIR data, case activity, "
            "investigation orders, and alerts. Verify the crime number and try again."
        )

    case_rows = [r for r in rows if r.get("_source") == "cases"]
    if not case_rows:
        return (
            "No case record found for that crime number within your jurisdiction. "
            "Verify the crime number and your access scope, then try again."
        )
    case_row = case_rows[0]
    activity_rows = [r for r in rows if r.get("_source") == "activity"]
    order_rows = [r for r in rows if r.get("_source") == "orders"]
    notif_rows = [r for r in rows if r.get("_source") == "notifications"]

    crime_no = case_row.get("crime_no", "N/A")
    crime_type = case_row.get("crime_type") or case_row.get("crime_head") or "N/A"
    status = case_row.get("status", "N/A")
    station = case_row.get("station", "N/A")
    district = case_row.get("district", "N/A")

    lines = [
        f"**Case Timeline — {crime_no}**",
        "",
        f"**Crime Type:** {crime_type}  |  **Status:** {status}  |  **Station:** {station} ({district})",
        "",
    ]

    # ── Timeline table (chronological, one row per recorded event) ──
    entries = []  # (sort_key, date_label, event_label, details)
    occurrence = case_row.get("occurrence_date") or case_row.get("date_reported")
    filing = case_row.get("filing_date")
    if occurrence:
        entries.append((occurrence, occurrence, "Incident reported", ""))
    if filing:
        entries.append((filing, filing, "FIR filed", ""))

    for a in activity_rows:
        ts = a.get("timestamp") or a.get("created_at") or ""
        action = a.get("action", "Case update")
        actor = a.get("user_name", "")
        desc = a.get("description", "")
        label = action.replace("_", " ").strip().title() or "Case update"
        details = desc or ""
        if actor:
            details = (details + " \u2014 by " + actor).strip()
        entries.append((ts, ts, label, details))

    for o in order_rows:
        ts = o.get("created_at") or ""
        num = o.get("order_number", "")
        title = o.get("title", "Investigation order")
        priority = o.get("priority", "")
        issued_by = o.get("issued_by", "")
        label = f"Order {num}".strip() if num else "Order"
        details = title or ""
        if priority:
            details += f" (priority: {priority})"
        if issued_by:
            details += f" \u2014 issued by {issued_by}"
        entries.append((ts, ts, label, details))

    for n in notif_rows:
        ts = n.get("created_at") or ""
        title = n.get("title", "Alert")
        severity = n.get("severity", "")
        details = title or ""
        if severity:
            details += f" (severity: {severity})"
        entries.append((ts, ts, "Alert", details))

    entries.sort(key=lambda e: (str(e[0] or ""), e[2], e[3]))

    if entries:
        lines.append("**Timeline of recorded events:**")
        lines.append("")
        lines.append("| Date/Time | Event | Details |")
        lines.append("|-----------|-------|---------|")
        dash = "\u2014"
        for _, date_label, label, details in entries:
            dl = date_label.replace("T", " ") if date_label else "Not recorded"
            lines.append(f"| {dl} | {label} | {details if details else dash} |")
    else:
        lines.append("**Timeline:** No dated events are recorded for this case in the database.")
    lines.append("")

    # ── Case facts table (grounded only) ──
    brief_facts = case_row.get("brief_facts") or case_row.get("description") or case_row.get("facts")
    victim = case_row.get("victim_name") or "Not recorded"
    complainant = case_row.get("complainant_name") or "Not recorded"
    accused = case_row.get("accused_names")
    if accused:
        try:
            names = json.loads(accused) if isinstance(accused, str) and accused.startswith("[") else accused
            if isinstance(names, list):
                accused_text = ", ".join(names) if names else "Not recorded"
            else:
                accused_text = str(accused)
        except Exception:
            accused_text = str(accused).strip("[]") or "Not recorded"
    else:
        accused_text = "Not recorded"
    assigned = case_row.get("assigned_to") or "Not recorded"

    lines.append("**Case facts (from FIR record):**")
    lines.append("")
    lines.append("| Field | Value |")
    lines.append("|-------|-------|")
    lines.append(f"| What happened | {brief_facts if brief_facts else 'Not recorded'} |")
    lines.append(f"| Victim | {victim} |")
    lines.append(f"| Complainant | {complainant} |")
    lines.append(f"| Accused | {accused_text} |")
    lines.append(f"| Investigating Officer | {assigned} |")
    lines.append("")

    # ── Explicitly-not-recorded section ──
    missing = []
    if not activity_rows:
        missing.append("no case activity events (e.g. arrest, chargesheet)")
    if not order_rows:
        missing.append("no investigation orders")
    if not notif_rows:
        missing.append("no system alerts")
    if missing:
        lines.append("**Not recorded in the platform:** " + "; ".join(missing) + ".")
        lines.append("")
    lines.append("_Timeline built from platform records only — no events are inferred._")

    return "\n".join(lines)


# ── Financial Intelligence (Suspicious Transaction Report) ─────────────
# Bounded, data-only intent: aggregate fraud-family FIR statistics plus
# recently registered case-scoped rows. Never produces individual risk
# profiles, never fabricates transactions.

_FRAUD_FAMILY_TYPES = [
    "Criminal Breach of Trust (Financial)",
    "Cheating & Fraud",
    "Online Financial Fraud",
    "Identity Theft",
    "Criminal Breach of Trust",
    "Cyber Fraud",
    "Cheating",
    "Fraud",
]


def _format_financial_intelligence(agg_rows, recent_rows, scope_label):
    """Stage 3 — deterministic, factual Suspicious Transaction Report.

    Aggregate fraud-family counts and recently registered case-scoped FIR
    rows only. No person-level scores, no inferred transactions.
    """
    if not agg_rows:
        return (
            "No fraud-type FIR records found within your jurisdiction scope "
            "in the platform database. The Suspicious Transaction Report is "
            "built only from recorded FIR data — nothing is inferred."
        )

    lines = [
        "**Financial Intelligence — Suspicious Transaction Report**",
        "",
        f"**Scope:** {scope_label}",
        "",
        "**Fraud-family FIR overview (recorded cases only):**",
        "",
        "| Crime Type | Total FIRs | Solved | Unresolved |",
        "|------------|-----------:|-------:|-----------:|",
    ]
    for r in agg_rows:
        lines.append(
            f"| {r.get('crime_type', 'Unknown')} | {r.get('total', 0)} "
            f"| {r.get('solved', 0)} | {r.get('unresolved', 0)} |"
        )
    lines.append("")

    if recent_rows:
        lines.append("**Most recently registered fraud-type FIRs:**")
        lines.append("")
        lines.append("| Crime No | Crime Type | Station | District | Occurrence Date | Status |")
        lines.append("|----------|------------|---------|----------|-----------------|--------|")
        for r in recent_rows:
            lines.append(
                f"| {r.get('crime_no', 'N/A')} | {r.get('crime_type', 'N/A')} "
                f"| {r.get('station') or 'Not recorded'} | {r.get('district') or 'Not recorded'} "
                f"| {str(r.get('occurrence_date') or 'Not recorded').replace('T', ' ')} "
                f"| {r.get('status', 'N/A')} |"
            )
        lines.append("")
    else:
        lines.append("**Most recently registered fraud-type FIRs:** none recorded.")
        lines.append("")

    lines.append(
        "_Report built from recorded FIR data only — no individual risk profiles "
        "are produced and no transactions are inferred._"
    )
    return "\n".join(lines)


def _fetch_financial_intelligence(user):
    """Stage 2 — fraud-family FIR aggregates for the Suspicious Transaction Report.

    Jurisdiction-scoped (station → stations lookup, district → districts
    lookup, fail-closed if unresolvable). Returns (reply_text, evidence).
    """
    evidence = []
    station_id = user.get("station_id")
    district_id = user.get("district_id")

    try:
        conn = get_db()
        try:
            def _cols(table):
                return [r[1] for r in conn.execute(f"PRAGMA table_info({table})")]

            cases_cols = _cols("cases")
            if "crime_type" not in cases_cols:
                evidence.append({"source_table": "cases", "row_count": 0,
                                 "filters_applied": {"error": "cases.crime_type column missing"}})
                return _format_financial_intelligence([], [], "Unresolved jurisdiction"), evidence

            # Schema-adaptive: deployed DB uses is_solved + occurrence_date/filing_date;
            # never query a missing column.
            if "is_solved" in cases_cols:
                solved_expr = "COALESCE(SUM(CASE WHEN is_solved = 1 THEN 1 ELSE 0 END), 0)"
            else:
                solved_expr = "COALESCE(SUM(CASE WHEN status LIKE '%closed%' OR status LIKE '%solved%' THEN 1 ELSE 0 END), 0)"
            if "occurrence_date" in cases_cols and "filing_date" in cases_cols:
                order_expr = "COALESCE(occurrence_date, filing_date)"
                date_cols = "occurrence_date, filing_date"
            elif "date_reported" in cases_cols:
                order_expr = "date_reported"
                date_cols = "date_reported"
            else:
                order_expr = "id"
                date_cols = ""

            scope_sql = ""
            scope_label = "State-wide (all districts)"
            params = []
            if station_id:
                row = conn.execute("SELECT name FROM stations WHERE id = ?", (int(station_id),)).fetchone()
                if not row:
                    evidence.append({"source_table": "stations", "row_count": 0,
                                     "filters_applied": {"error": "station not found"}})
                    return _format_financial_intelligence([], [], "Unresolved jurisdiction"), evidence
                scope_sql = " AND station = ?"
                params = [row[0]]
                scope_label = f"Station: {row[0]}"
            elif district_id:
                row = conn.execute("SELECT name FROM districts WHERE id = ?", (int(district_id),)).fetchone()
                if not row:
                    evidence.append({"source_table": "districts", "row_count": 0,
                                     "filters_applied": {"error": "district not found or districts table unavailable"}})
                    return _format_financial_intelligence([], [], "Unresolved jurisdiction"), evidence
                scope_sql = " AND district = ?"
                params = [row[0]]
                scope_label = f"District: {row[0]}"

            placeholders = ", ".join("?" * len(_FRAUD_FAMILY_TYPES))
            base_where = f"crime_type IN ({placeholders})"
            filters = {"crime_types": _FRAUD_FAMILY_TYPES, "scope": scope_label}

            agg_sql = (
                "SELECT crime_type, COUNT(*) AS total, "
                f"{solved_expr} AS solved "
                f"FROM cases WHERE {base_where}{scope_sql} "
                "GROUP BY crime_type ORDER BY total DESC"
            )
            agg_rows = [dict(r) for r in conn.execute(agg_sql, params + list(_FRAUD_FAMILY_TYPES)).fetchall()]
            for r in agg_rows:
                r["unresolved"] = max(int(r.get("total", 0)) - int(r.get("solved", 0)), 0)
            evidence.append({"source_table": "cases", "row_count": sum(r["total"] for r in agg_rows),
                             "filters_applied": filters})

            recent_sql = (
                "SELECT crime_no, crime_type, station, district, status"
                f"{', ' + date_cols if date_cols else ''} "
                f"FROM cases WHERE {base_where}{scope_sql} "
                f"ORDER BY {order_expr} DESC LIMIT 8"
            )
            recent_rows = [dict(r) for r in conn.execute(recent_sql, params + list(_FRAUD_FAMILY_TYPES)).fetchall()]

            return _format_financial_intelligence(agg_rows, recent_rows, scope_label), evidence
        finally:
            conn.close()
    except Exception as e:
        evidence.append({"source_table": "cases", "row_count": 0,
                         "filters_applied": {"error": str(e)[:200]}})
        return _format_financial_intelligence([], [], "Unresolved jurisdiction"), evidence


_COPILOT_FORMATTERS = {
    "crime_trends": _format_crime_trends,
    "hotspot": _format_hotspot,
    "suspect_lookup": _format_suspect,
    "victim_stats": _format_victim_stats,
    "station_performance": _format_station,
    "officer_assignment": _format_officer_assignment,
    "predictive": _format_predictive,
    "policy_recommendations": _format_policy_recommendations,
    "case_timeline": _format_case_timeline,
}


# ── New Copilot Chat Handler ─────────────────────────────────────────
# This is the handler for POST /api/copilot/chat (the route the frontend calls)
# Uses: intent classification → SQL query → formatted table response
# For general chat: calls QuickML with platform context

_COPILOT_PLATFORM_CONTEXT = """
You are Drishti, the AI assistant for Bengaluru's police intelligence platform (Karnataka State Police).

PLATFORM CAPABILITIES — What you can do:
- Crime trend analysis (ask: "show crime trends")
- Suspect lookup (ask: "find suspect [name]")
- Hotspot identification (ask: "where are crime hotspots?")
- Station performance (ask: "how is [station] performing?")
- Case assignments (ask: "who is assigned to cases?")
- Victim statistics (ask: "victim demographics")
- Predictive policing (ask: "predictive insights for next 30 days")

RULES:
- NEVER make up data. Only use data provided in context.
- A "LIVE DATA CONTEXT" snapshot of real KSP aggregates is appended to your
  system prompt when available. Use ONLY that snapshot for any factual claims
  about cases, crime types, counts, stations, statuses, or trends.
- If the user asks for specific records NOT present in LIVE DATA CONTEXT
  (specific case numbers, officer/inspector names, victim or suspect
  identities, exact dates), DO NOT invent them. Say you do not have that
  specific record in this chat, then offer a grounded query you can run,
  e.g. "find suspect [name]", "show crime trends", "who is assigned to
  cases", "timeline for <crime no>", "how is <station> performing".
- NEVER produce case numbers, officer names, statistics, or FIR details that
  are not in LIVE DATA CONTEXT. Fabricating police records is prohibited.
- NEVER say "I can help you with..." — actually help with data.
- Keep responses concise (1-3 sentences).
- Be direct, professional, and actionable.
"""


def _build_copilot_data_context() -> str:
    """Real KSP data snapshot (aggregates only) used to ground general-chat
    LLM answers, so the model never fabricates records. Pure SQL, no LLM."""
    try:
        conn = get_db()
        try:
            total = conn.execute("SELECT COUNT(*) AS c FROM cases").fetchone()["c"] or 0
            status_rows = conn.execute(
                "SELECT status, COUNT(*) AS c FROM cases "
                "WHERE status IS NOT NULL AND status != '' "
                "GROUP BY status ORDER BY c DESC LIMIT 6"
            ).fetchall()
            type_rows = conn.execute(
                "SELECT crime_type, COUNT(*) AS c FROM cases "
                "WHERE crime_type IS NOT NULL AND crime_type != '' "
                "GROUP BY crime_type ORDER BY c DESC LIMIT 6"
            ).fetchall()
            station_rows = conn.execute(
                "SELECT station, COUNT(*) AS c FROM cases "
                "WHERE station IS NOT NULL AND station != '' "
                "GROUP BY station ORDER BY c DESC LIMIT 6"
            ).fetchall()
            latest_rows = conn.execute(
                "SELECT crime_no, crime_type, station, status FROM cases "
                "ORDER BY created_at DESC LIMIT 5"
            ).fetchall()
        finally:
            conn.close()
    except Exception as e:
        logger.warning("Failed to build copilot data context: %s", e)
        return ""

    lines = [f"Total FIR cases on record: {total}"]
    if status_rows:
        lines.append("Status breakdown: " + ", ".join(f"{r['status']}={r['c']}" for r in status_rows))
    if type_rows:
        lines.append("Top crime types: " + ", ".join(f"{r['crime_type']} ({r['c']})" for r in type_rows))
    if station_rows:
        lines.append("Top stations by case count: " + ", ".join(f"{r['station']} ({r['c']})" for r in station_rows))
    if latest_rows:
        lines.append("Most recent FIRs: " + "; ".join(
            f"{r['crime_no']} - {r['crime_type']} @ {r['station']} ({r['status']})" for r in latest_rows))
    return "\n".join(lines)

def _extract_case_id(text: str) -> str:
    """Extract a crime/case number from free text (mirror of local intent.py)."""
    m = re.search(r"([A-Z]{1,4}[-/]?\d{4}[-/]?\d{1,10}|[0-9]{10,20})", text or "", re.I)
    return m.group(1).upper() if m else ""


def _handle_copilot_chat(body: dict, request=None):
    """POST /api/copilot/chat — intelligent copilot with intent classification."""
    user = _get_auth_user_or_demo(request)
    if not user:
        return _error_response("Authentication required", 401)

    message = (body or {}).get("message", "")
    language = (body or {}).get("language", "en")

    if not message:
        return _error_response("message is required", 400)

    # Step 1: Classify intent
    intent, confidence, entities = _classify_copilot_intent(message)

    # Step 2: If it's a data intent, run SQL query and format response
    data_intents = {"crime_trends", "hotspot", "suspect_lookup", "victim_stats",
                    "station_performance", "officer_assignment", "predictive",
                    "policy_recommendations", "case_timeline", "financial_intelligence"}

    if intent == "risk_score_denied" and confidence >= _CONFIDENCE_THRESHOLD:
        # Individual risk scoring was removed from the platform. Bounded refusal —
        # never fabricates data and never reaches the LLM.
        return _json_response({
            "session_id": f"sess-{uuid.uuid4().hex[:12]}",
            "reply_text": (
                "Individual risk scoring is no longer available on this platform. "
                "I can help with case-level and area-level analysis instead: "
                "case timelines, suspect records (case history & modus operandi), "
                "crime trends, hotspots, station performance, or predictive "
                "area-level insights."
            ),
            "reply_language": language,
            "intent_detected": intent,
            "classification_confidence": round(confidence, 2),
            "classification_tier": "rule_based",
            "query_evidence": [],
            "clarification_needed": False,
            "clarification_prompt": None,
        })

    if intent in data_intents and confidence >= _CONFIDENCE_THRESHOLD:
        # ── Case timeline: multi-source joined fetch (bounded, never LLM) ──
        if intent == "case_timeline":
            case_id = _extract_case_id(message)
            station_id = user.get("station_id")
            district_id = user.get("district_id")
            if not case_id:
                return _json_response({
                    "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                    "reply_text": (
                        "I can build a case timeline, but I need the crime number. "
                        "Example: 'give me a timeline for CR-2026-49637'."
                    ),
                    "reply_language": language,
                    "intent_detected": intent,
                    "classification_confidence": round(confidence, 2),
                    "classification_tier": "rule_based",
                    "query_evidence": [],
                    "clarification_needed": True,
                    "clarification_prompt": "Provide the crime/case number.",
                })
            evidence, rows = _fetch_case_timeline(case_id, station_id, district_id)
            reply_text = _format_case_timeline(rows)
            return _json_response({
                "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                "reply_text": reply_text,
                "reply_language": language,
                "intent_detected": intent,
                "classification_confidence": round(confidence, 2),
                "classification_tier": "rule_based",
                "query_evidence": evidence,
                "clarification_needed": False,
                "clarification_prompt": None,
            })

        # ── Financial intelligence: fraud-family FIR aggregates (bounded, never LLM) ──
        if intent == "financial_intelligence":
            # Role gate: this report is a state-level command feature.
            roles = user.get("roles") or []
            if "SUPER_ADMIN" not in roles:
                return _json_response({
                    "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                    "reply_text": (
                        "The Financial Intelligence — Suspicious Transaction Report is a "
                        "state-level command feature. You do not have permission to view it."
                    ),
                    "reply_language": language,
                    "intent_detected": intent,
                    "classification_confidence": round(confidence, 2),
                    "classification_tier": "rule_based",
                    "query_evidence": [],
                    "clarification_needed": False,
                    "clarification_prompt": None,
                })
            reply_text, fin_evidence = _fetch_financial_intelligence(user)
            return _json_response({
                "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                "reply_text": reply_text,
                "reply_language": language,
                "intent_detected": intent,
                "classification_confidence": round(confidence, 2),
                "classification_tier": "rule_based",
                "query_evidence": fin_evidence,
                "clarification_needed": False,
                "clarification_prompt": None,
            })

        query = _COPILOT_QUERIES.get(intent, "")
        if query:
            try:
                conn = get_db()
                try:
                    # Build params for LIKE queries
                    params = []
                    if intent == "suspect_lookup":
                        name = entities.get("name", "")
                        params.append(f"%{name}%" if name else "%")
                    elif intent == "station_performance":
                        station = entities.get("station", "")
                        params.append(f"%{station}%" if station else "%")

                    if params:
                        cursor = conn.execute(query, params)
                    else:
                        cursor = conn.execute(query)

                    rows = [dict(r) for r in cursor.fetchall()]
                finally:
                    conn.close()

                if rows:
                    formatter = _COPILOT_FORMATTERS.get(intent)
                    if formatter:
                        reply_text = formatter(rows)
                    else:
                        reply_text = f"Found {len(rows)} records for {intent}."
                else:
                    reply_text = f"No data found for your query. Try asking about available crime data."
            except Exception as e:
                logger.error("Copilot query failed: %s", e)
                reply_text = "An error occurred while fetching data. Please try again."

            return _json_response({
                "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                "reply_text": reply_text,
                "reply_language": language,
                "intent_detected": intent,
                "classification_confidence": round(confidence, 2),
                "classification_tier": "rule_based",
                "query_evidence": [],
                "clarification_needed": False,
                "clarification_prompt": None,
            })

    # Step 3: Handle greetings directly (avoid QuickML mock)
    greeting_patterns = re.compile(r"^(?:hi|hello|hey|good\s*(?:morning|afternoon|evening)|yo|nam|hii|hlo|👋|ಹಲೋ|ನಮಸ್ಕಾರ)\b", re.I)
    if greeting_patterns.match(message.strip()):
        reply_text = "Hello! I'm Drishti, your Bengaluru Police Intelligence copilot. I can help with:\n• Crime trend analysis (e.g., 'show crime trends')\n• Policy recommendations (e.g., 'policy recommendations based on crime')\n• Suspect lookup (e.g., 'find suspect Kumar')\n• Hotspot mapping (e.g., 'where are crime hotspots?')\n• Station performance (e.g., 'how is Nandini Layout station?')\n• Predictive analysis (e.g., 'predict crime trends')\n• Victim statistics and more\n\nWhat would you like to explore?"
        return _json_response({
            "session_id": f"sess-{uuid.uuid4().hex[:12]}",
            "reply_text": reply_text,
            "reply_language": language,
            "intent_detected": "greeting",
            "classification_confidence": 1.0,
            "classification_tier": "rule_based",
            "query_evidence": [],
            "clarification_needed": False,
            "clarification_prompt": None,
        })

    # Step 4: General chat — use QuickML with platform context
    # Master-prompt rule: MOCK_AI=true is an explicit ERROR STATE, never a
    # silent mock fallback. Surface it so operators fix config.
    if os.environ.get("MOCK_AI", "false").lower() in ("1", "true", "yes"):
        return _json_response({
            "session_id": f"sess-{uuid.uuid4().hex[:12]}",
            "reply_text": (
                "AI generation is currently unavailable: the deployment is in "
                "MOCK_AI=true state (no real model configured). Set MOCK_AI=false "
                "and configure QuickML credentials to enable AI responses. "
                "Grounded data queries (trends, cases, timelines, hotspots) "
                "continue to work."
            ),
            "reply_language": language,
            "intent_detected": intent,
            "classification_confidence": round(confidence, 2),
            "classification_tier": "rule_based" if confidence >= _CONFIDENCE_THRESHOLD else "llm_fallback",
            "query_evidence": [],
            "clarification_needed": False,
            "clarification_prompt": None,
            "ai_state": "mock_disabled_error",
        }, 503)

    data_context = _build_copilot_data_context()
    system_prompt = _COPILOT_PLATFORM_CONTEXT
    if data_context:
        system_prompt += (
            "\n\nLIVE DATA CONTEXT (real data from the KSP database — "
            "use ONLY this for factual claims):\n" + data_context + "\n"
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message},
    ]

    response_text = _call_quickml(messages)
    if response_text is None:
        response_text = "I'm Drishti, your AI assistant. I can help analyze crime data, find suspects, and understand patterns. What would you like to know?"

    return _json_response({
        "session_id": f"sess-{uuid.uuid4().hex[:12]}",
        "reply_text": response_text,
        "reply_language": language,
        "intent_detected": intent,
        "classification_confidence": round(confidence, 2),
        "classification_tier": "rule_based" if confidence >= _CONFIDENCE_THRESHOLD else "llm_fallback",
        "query_evidence": [],
        "clarification_needed": False,
        "clarification_prompt": None,
    })


# ═══════════════════════════════════════════════════════════════════════
#  CATALYST HANDLER
# ═══════════════════════════════════════════════════════════════════════

# Init database on module load
try:
    init_database()
    logger.info("Database initialized successfully")
except Exception as e:
    logger.error("Database init failed: %s", e)


def handler(request=None, response=None):
    """Catalyst Advanced I/O handler."""
    try:
        # Determine request details
        path = "/"
        method = "GET"
        body = None
        
        if request is not None:
            if hasattr(request, 'path'):
                path = request.path
            elif hasattr(request, 'url'):
                from urllib.parse import urlparse
                path = urlparse(str(request.url)).path
                
            if hasattr(request, 'method'):
                method = request.method.upper()
               
            body = _get_json_body(request)

        # Strip query string from path for exact route matching
        if '?' in path:
            path_query_qs = path.split('?', 1)
            path = path_query_qs[0]
            if not hasattr(request, 'query_string') or not request.query_string:
                setattr(request, 'query_string', path_query_qs[1])
        
        # Strip prefix
        prefix = "/server/neural-justice-backend"
        if path.startswith(prefix):
            path = path[len(prefix):] or "/"
        
        # Clean root path
        if path == "":
            path = "/"
        
        # Log the request
        logger.info("Request: %s %s (body: %s)", method, path, body)
        
        # Route requests
        if path == "/api/health" and method == "GET":
            return _handle_health()
        
        if path == "/" and method == "GET":
            return _handle_root()
        
        if path == "/api/auth/login" and method == "POST":
            return _handle_login(body)
        
        if path == "/api/auth/logout" and method == "POST":
            return _json_response({"status": "ok", "message": "Logged out successfully"})
        
        if path == "/api/auth/verify-mfa" and method == "POST":
            return _handle_verify_mfa(body)
        
        # ── AI / QuickML routes ────────────────────────────────────
        if path == "/api/ai/copilot" and method == "POST":
            return _handle_ai_copilot(body, request)
        
        if path == "/api/ai/copilot/chat" and method == "POST":
            return _handle_ai_copilot_chat(body, request)
        
        if path == "/api/ai/query" and method == "POST":
            return _handle_ai_query(body, request)
        
        if path == "/api/ai/sessions" and method == "GET":
            return _handle_ai_sessions(body, request)
        
        # ── New Copilot route (intent-classified, SQL-backed) ─────
        if path == "/api/copilot/chat" and method == "POST":
            return _handle_copilot_chat(body, request)
        
        # ── Stations ──────────────────────────────────────────────
        if path == "/api/stations" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM stations WHERE status='active'").fetchall()
                return _json_response([dict(r) for r in rows])
            finally: conn.close()
        
        if path.startswith("/api/stations/") and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            station_id = path.split("/")[-1]
            conn = get_db()
            try:
                row = conn.execute("SELECT * FROM stations WHERE id=?", (station_id,)).fetchone()
                return _json_response(dict(row) if row else {})
            finally: conn.close()

        # ── Criminal Profiles ─────────────────────────────────────
        if path == "/api/criminal-profiles" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM criminal_profiles WHERE status='active'").fetchall()
                profiles = [dict(r) for r in rows]
                # Individual risk scoring is not surfaced by this platform.
                for p in profiles:
                    p.pop("risk_score", None)
                return _json_response(profiles)
            finally: conn.close()
        
        if path.startswith("/api/criminal-profiles/") and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            pid = path.split("/")[-1]
            conn = get_db()
            try:
                row = conn.execute("SELECT * FROM criminal_profiles WHERE id=?", (pid,)).fetchone()
                p = dict(row) if row else {}
                # Individual risk scoring is not surfaced by this platform.
                p.pop("risk_score", None)
                return _json_response(p)
            finally: conn.close()

        # ── Cases ─────────────────────────────────────────────────
        if path == "/api/cases" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()
                return _json_response([dict(r) for r in rows])
            finally: conn.close()
        
        if path.startswith("/api/cases/") and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            cid = path.split("/")[-1]
            conn = get_db()
            try:
                row = conn.execute("SELECT * FROM cases WHERE case_number=?", (cid,)).fetchone()
                return _json_response(dict(row) if row else {})
            finally: conn.close()

        # ── Orders ────────────────────────────────────────────────
        if path == "/api/orders" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM orders ORDER BY created_at DESC").fetchall()
                return _json_response([dict(r) for r in rows])
            finally: conn.close()

        # ── Activity ──────────────────────────────────────────────
        if path == "/api/activity" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM activity ORDER BY timestamp DESC LIMIT 100").fetchall()
                return _json_response([dict(r) for r in rows])
            finally: conn.close()

        # ── Notifications ─────────────────────────────────────────
        if path == "/api/notifications" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM notifications WHERE read_status='unread' ORDER BY created_at DESC LIMIT 50").fetchall()
                return _json_response([dict(r) for r in rows])
            finally: conn.close()

        if path == "/api/notifications/unread-count" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                cur = conn.execute("SELECT COUNT(*) as count FROM notifications WHERE read_status='unread'")
                row = cur.fetchone()
                return _json_response({"unread_count": row["count"] if row else 0})
            finally: conn.close()

        # ── Patrol Units ──────────────────────────────────────────
        if path == "/api/patrol" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM patrol_units WHERE status='active'").fetchall()
                return _json_response([dict(r) for r in rows])
            finally: conn.close()

        # ── AI Situation Room ─────────────────────────────────────
        if path == "/api/ai-situation-room" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM ai_situation_room WHERE status='active' ORDER BY last_updated DESC").fetchall()
                return _json_response([dict(r) for r in rows])
            finally: conn.close()

        # ── Crime Patterns ────────────────────────────────────────
        if path == "/api/crime-patterns" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM crime_patterns ORDER BY analysis_date DESC").fetchall()
                return _json_response([dict(r) for r in rows])
            finally: conn.close()

        # ── AI / QuickML routes ────────────────────────────────────
        if path == "/api/ai/copilot" and method == "POST":
            return _handle_ai_copilot(body, request)
        
        if path == "/api/ai/copilot/chat" and method == "POST":
            return _handle_ai_copilot_chat(body, request)
        
        if path == "/api/ai/query" and method == "POST":
            return _handle_ai_query(body, request)
        
        if path == "/api/ai/sessions" and method == "GET":
            return _handle_ai_sessions(body, request)
        
        # /api/ai/sessions/{id}/messages
        import re
        m = re.match(r"^/api/ai/sessions/([^/]+)/messages$", path)
        if m:
            session_id = m.group(1)
            if method == "GET":
                return _handle_ai_session_messages(session_id, body, request, "GET")
            if method == "POST":
                return _handle_ai_session_messages(session_id, body, request, "POST")

        # ── Dashboard endpoints ────────────────────────────────────
        if path == "/api/dashboard/stations" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            dc = _get_query_param(request, "district_code", "BENGALURU_URBAN")
            conn = get_db()
            try:
                rows = conn.execute("""
                SELECT s.id, s.name, s.code, s.district, s.division, s.type,
                       s.officer_count, s.active_cases as open_cases, s.solved_rate,
                       s.lat, s.lng, s.phone, s.incharge, s.status, s.created_at,
                       COALESCE(c.fir_count, 0) as fir_count,
                       s.created_at as last_reported,
                       0.0 as trend
                FROM stations s
                LEFT JOIN (
                    SELECT station, COUNT(*) as fir_count FROM cases GROUP BY station
                ) c ON c.station = s.name
                WHERE s.status='active'
            """).fetchall()
                stations = [dict(r) for r in rows]
                if not stations:
                    stations = SAMPLE_STATIONS
                return _json_response({"stations": stations, "total": len(stations)})
            finally: conn.close()

        if path == "/api/dashboard/metrics" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({
                "todays_firs": 124, "active_investigations": 3471, "crime_index": 72.4,
                "ai_alerts": 12, "active_cases": 3471, "prediction_accuracy": 85.6,
                "district_count": 31, "station_count": 906, "division_count": 4,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            })

        if path == "/api/dashboard/trend" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            trend = [{"date": (now - timedelta(days=29-i)).strftime("%Y-%m-%d"), "count": random.randint(50, 200)} for i in range(30)]
            return _json_response({"trend": trend})

        if path == "/api/dashboard/districts" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({"districts": [
                {"district": "Bengaluru Urban", "count": 2847},
                {"district": "Mysuru", "count": 1123},
                {"district": "Belagavi", "count": 876},
                {"district": "Kalaburagi", "count": 987},
                {"district": "Dakshina Kannada", "count": 765},
            ]})

        if path == "/api/dashboard/sp-metrics" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            dc = _get_query_param(request, "district_code", "BENGALURU_URBAN")
            conn = get_db()
            try:
                rows = conn.execute("SELECT COUNT(*) as total, ROUND(AVG(solved_rate),1) as solved_rate FROM stations WHERE status='active'").fetchone()
                total_firs = rows["total"] * 72 if rows else 720
                solved_rate = rows["solved_rate"] if rows else 82.3
            finally: conn.close()
            return _json_response({
                "district_code": dc, "district_name": "Bengaluru Urban", "division_name": "Bengaluru Division",
                "station_count": 10, "active_stations": 9, "total_firs": total_firs, "firs_trend": 8.5,
                "open_cases": total_firs // 7, "solved_rate": solved_rate, "active_warnings": 3,
                "crime_types": [
                    {"type": "Theft", "count": 198, "pct": 27.2, "delta": 5},
                    {"type": "Burglary", "count": 156, "pct": 21.4, "delta": -3},
                    {"type": "Assault", "count": 124, "pct": 17.0, "delta": 2},
                    {"type": "Robbery", "count": 98, "pct": 13.5, "delta": 0},
                    {"type": "Chain Snatching", "count": 76, "pct": 10.4, "delta": 7},
                ],
                "trend_6m": [{"date": (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d"), "count": random.randint(20, 80)} for i in range(180)],
                "recent_firs": [
                    {"crime_no": "FIR-100-2026", "status": "under_investigation", "occurrence_date": "2026-07-20", "crime_type": "Theft", "station_name": "Vijayanagar PS"},
                    {"crime_no": "FIR-101-2026", "status": "charged", "occurrence_date": "2026-07-18", "crime_type": "Burglary", "station_name": "Jayanagar PS"},
                ],
                "financial_alerts": [], "last_updated": datetime.now(timezone.utc).isoformat(),
            })

        if path == "/api/dashboard/pi-metrics" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            sn = _get_query_param(request, "station_name", "Vijayanagar PS")
            return _json_response({
                "station_name": sn, "district_name": "Bengaluru Urban", "total_firs": 42,
                "fir_trend": 12.5, "open_cases": 18, "solved_rate": 38.2, "high_priority_count": 2,
                "high_priority_cases": [
                    {"fir_no": "FIR-100-2026", "crime_type": "Robbery", "station": "Vijayanagar PS", "days_open": 45},
                    {"fir_no": "FIR-101-2026", "crime_type": "Assault", "station": "Jayanagar PS", "days_open": 38},
                ],
                "active_warnings": [],
                "trend_3m": [{"date": (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d"), "count": random.randint(1, 6)} for i in range(90)],
                "recent_firs": [],
                "crime_types": [{"type": "Theft", "count": 14, "pct": 33.3, "delta": 5}, {"type": "Robbery", "count": 9, "pct": 21.4, "delta": -2}],
                "last_updated": datetime.now(timezone.utc).isoformat(),
            })

        if path == "/api/dashboard/psi-metrics" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            sn = _get_query_param(request, "station_name", "Vijayanagar PS")
            return _json_response({
                "station_name": sn, "district_name": "Bengaluru Urban", "total_firs": 42,
                "fir_trend": 12.5, "assigned_firs": 8, "solved_rate": 38.2, "active_hotspots": 3,
                "hotspot_points": [{"lat": 12.9, "lng": 77.5, "weight": 7, "crime_type": "Theft"}, {"lat": 12.94, "lng": 77.56, "weight": 5, "crime_type": "Robbery"}],
                "crime_types": [], "seasonal_data": [], "trend_3m": [], "forecast_30d": [],
                "emerging_threats": [], "recent_firs": [], "last_updated": datetime.now(timezone.utc).isoformat(),
            })

        if path == "/api/dashboard/pc-metrics" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            oid = _get_query_param(request, "officer_id", "PC001")
            now = datetime.now()
            shifts = ['Morning Shift', 'Afternoon Shift', 'Night Shift']
            shift = shifts[0 if now.hour < 12 else 1 if now.hour < 17 else 2]
            return _json_response({
                "officer_name": "PC Vikram Singh", "officer_id": oid, "badge_number": oid,
                "station_name": "Vijayanagar PS", "district_name": "Bengaluru Urban", "open_fir_count": 5,
                "assigned_firs": [
                    {"crime_no": "FIR-100-2026", "status": "under_investigation", "occurrence_date": "2026-07-15", "crime_type": "Robbery", "brief_facts": "Armed robbery near commercial establishment"},
                    {"crime_no": "FIR-101-2026", "status": "registered", "occurrence_date": "2026-07-18", "crime_type": "Theft", "brief_facts": "Housebreaking and theft reported"},
                ],
                "station_info": {"name": "Vijayanagar PS", "district": "Bengaluru Urban", "phone": "080-22000000", "address": "Vijayanagar, Bengaluru, Karnataka 560040"},
                "activity_feed": [],
                "daily_brief": {"greeting": "Good morning, PC Vikram Singh", "day": now.strftime("%A"), "date": now.strftime("%d %B %Y"), "shift": shift, "open_count": 5, "message": "You have 5 active cases assigned to you at Vijayanagar PS."},
                "last_updated": datetime.now(timezone.utc).isoformat(),
            })

        if path == "/api/dashboard/cp-metrics" and method == "GET":
            user = _get_auth_user(request)
            # Allow demo sessions (no auth header sent for demo users)
            auth_header = None
            if hasattr(request, 'headers'):
                hdrs = request.headers
                if callable(hdrs):
                    hdrs = hdrs()
                if isinstance(hdrs, dict):
                    auth_header = hdrs.get("Authorization", "")
            if not user and auth_header != "Bearer demo-session":
                return _error_response("Authentication required", 401)
            now = datetime.now()
            months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            return _json_response({
                "total_firs": 12483, "total_firs_trend": 8.2, "open_cases": 3471, "open_cases_trend": 5.7,
                "solved_rate": 72.4, "solved_rate_trend": -2.1, "total_officers": 28492, "on_duty": 18340,
                "active_stations": 876, "active_warnings": 12, "warnings_trend": 25.0,
                "district_count": 31, "station_count": 906, "division_count": 4,
                "division_breakdown": [
                    {"id": 1, "name": "Bengaluru", "district_count": 8, "total_firs": 4231, "pct_of_state": 33.9, "top_crime_type": "Theft", "trend": 12.4},
                    {"id": 2, "name": "Mysuru", "district_count": 6, "total_firs": 2912, "pct_of_state": 23.3, "top_crime_type": "Robbery", "trend": -3.1},
                    {"id": 3, "name": "Belagavi", "district_count": 9, "total_firs": 3187, "pct_of_state": 25.5, "top_crime_type": "Assault", "trend": 5.8},
                    {"id": 4, "name": "Kalaburagi", "district_count": 8, "total_firs": 2153, "pct_of_state": 17.2, "top_crime_type": "Burglary", "trend": -1.5},
                ],
                "district_rankings": [{"id": 1, "name": "Bengaluru Urban", "fir_count": 2847, "pct_of_max": 100, "delta": 142}, {"id": 2, "name": "Bengaluru Rural", "fir_count": 1384, "pct_of_max": 48.6, "delta": 87}],
                "top_districts_solved": [{"id": 1, "name": "Kodagu", "fir_count": 187, "solved_rate": 88.3, "officer_count": 420}, {"id": 2, "name": "Udupi", "fir_count": 312, "solved_rate": 84.7, "officer_count": 385}],
                "audit_events_today": 284, "active_sessions": 1247, "avg_api_ms": 187, "cache_hit_rate": 92.6,
                "trend_12m": [{"date": f"{months[(now.month + i - 12) % 12]} {now.year}", "count": 900 + random.randint(0, 300) + i * 50} for i in range(12)],
            })

        # ── FIR Operations (used by FIROperations, FIRDetailPage, etc.) ─────────────
        if path == "/api/fir-ops/filters/options" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                districts = [r["district"] for r in conn.execute("SELECT DISTINCT district FROM cases WHERE district IS NOT NULL AND district != '' ORDER BY district").fetchall()]
                crime_types = [r["crime_type"] for r in conn.execute("SELECT DISTINCT crime_type FROM cases WHERE crime_type IS NOT NULL AND crime_type != '' ORDER BY crime_type").fetchall()]
                stations = [r["station"] for r in conn.execute("SELECT DISTINCT station FROM cases WHERE station IS NOT NULL AND station != '' ORDER BY station").fetchall()]
                statuses = [r["status"] for r in conn.execute("SELECT DISTINCT status FROM cases WHERE status IS NOT NULL AND status != '' ORDER BY status").fetchall()]
                severities = ["critical", "high", "medium", "low"]
                return _json_response({"districts": districts, "crime_types": crime_types, "stations": stations, "statuses": statuses, "severities": severities})
            finally: conn.close()

        if path == "/api/fir-ops" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)

            # Read filter params (matching FIRFilters field names)
            district = _get_query_param(request, "district", "all")
            station = _get_query_param(request, "station", "all")
            crime_type = _get_query_param(request, "crime_type", "all")
            status = _get_query_param(request, "status", "all")
            severity = _get_query_param(request, "severity", "all")
            search = _get_query_param(request, "search", "")
            date_from = _get_query_param(request, "date_from", "")
            date_to = _get_query_param(request, "date_to", "")
            page = int(_get_query_param(request, "page", "1"))
            limit = int(_get_query_param(request, "limit", "200"))

            # Map frontend status values to DB status values
            STATUS_MAP = {
                "open": ["under_investigation", "transferred_to_other_ps"],
                "under_investigation": ["under_investigation"],
                "pending_trial": ["charge_sheeted", "pending_court_trial"],
                "closed": ["closed_-_undetected", "closed_-_false_case"],
                "resolved": ["acquitted", "convicted"],
            }
            # Map severity to crime type keywords (heuristic)
            SEVERITY_CRITICAL = ["Murder", "Rape", "Attempt to Murder", "Dacoity", "POCSO", "Kidnapping", "Arms Act", "NDPS"]
            SEVERITY_HIGH = ["Robbery", "Grievous Hurt", "Dowry Death", "Cruelty by Husband", "House Break-in", "Rioting"]
            SEVERITY_MEDIUM = ["Hurt", "Theft", "Cheating", "Criminal Breach of Trust", "Online Financial Fraud", "Cyberstalking", "Child Kidnapping", "Motor Vehicle Theft"]
            # Default: low

            conn = get_db()
            try:
                where_clauses = []
                params = []

                if district != "all":
                    where_clauses.append("c.district = ?")
                    params.append(district)
                if station != "all":
                    where_clauses.append("c.station = ?")
                    params.append(station)
                if crime_type != "all":
                    where_clauses.append("c.crime_type = ?")
                    params.append(crime_type)
                if status != "all":
                    db_statuses = STATUS_MAP.get(status, [status])
                    placeholders = ",".join("?" * len(db_statuses))
                    where_clauses.append(f"c.status IN ({placeholders})")
                    params.extend(db_statuses)
                if severity != "all":
                    if severity == "critical":
                        where_clauses.append("c.crime_type IN ({})".format(",".join("?" * len(SEVERITY_CRITICAL))))
                        params.extend(SEVERITY_CRITICAL)
                    elif severity == "high":
                        where_clauses.append("c.crime_type IN ({})".format(",".join("?" * len(SEVERITY_HIGH))))
                        params.extend(SEVERITY_HIGH)
                    elif severity == "medium":
                        where_clauses.append("c.crime_type IN ({})".format(",".join("?" * len(SEVERITY_MEDIUM))))
                        params.extend(SEVERITY_MEDIUM)
                    # low = everything else (no filter)
                if search:
                    where_clauses.append("(c.crime_no LIKE ? OR c.crime_type LIKE ? OR c.station LIKE ? OR c.district LIKE ? OR c.victim_name LIKE ? OR c.brief_facts LIKE ?)")
                    like = f"%{search}%"
                    params.extend([like] * 6)
                if date_from:
                    where_clauses.append("c.occurrence_date >= ?")
                    params.append(date_from)
                if date_to:
                    where_clauses.append("c.occurrence_date <= ?")
                    params.append(date_to)

                where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
                offset = (page - 1) * limit

                # Count total
                total_row = conn.execute(f"SELECT COUNT(*) as cnt FROM cases c WHERE {where_sql}", params).fetchone()
                total = total_row["cnt"] if total_row else 0

                # Fetch page
                rows = conn.execute(f"""
                    SELECT c.* FROM cases c WHERE {where_sql} ORDER BY c.created_at DESC LIMIT ? OFFSET ?
                """, params + [limit, offset]).fetchall()

                # Map to FIR interface
                def _severity_for_crime(ct):
                    if ct in SEVERITY_CRITICAL: return "critical"
                    if ct in SEVERITY_HIGH: return "high"
                    if ct in SEVERITY_MEDIUM: return "medium"
                    return "low"

                def _status_for_db(s):
                    if s in ("under_investigation",): return "under_investigation"
                    if s in ("charge_sheeted", "pending_court_trial"): return "pending_trial"
                    if s in ("closed_-_undetected", "closed_-_false_case"): return "closed"
                    if s in ("acquitted", "convicted"): return "resolved"
                    if s in ("transferred_to_other_ps",): return "open"
                    return "under_investigation"

                def _days_open(occurrence, filing):
                    # Days since the case was registered. Prefer occurrence_date
                    # (realistic spread in the seed data); fall back to
                    # filing_date. Never return a negative for future dates.
                    d = (occurrence or filing or "").strip()
                    if not d:
                        return 0
                    try:
                        return max(0, (date.today() - date.fromisoformat(d[:10])).days)
                    except ValueError:
                        return 0

                firs = []
                for r in rows:
                    accused_list = json.loads(r["accused_names"]) if isinstance(r["accused_names"], str) and r["accused_names"].startswith("[") else []
                    accused_name = accused_list[0] if accused_list else (r["complainant_name"] if r["complainant_name"] else "")
                    victim_name = r["victim_name"] if r["victim_name"] else ""
                    brief_facts = r["brief_facts"] if r["brief_facts"] else ""
                    dist = r["district"] if r["district"] else ""
                    firs.append({
                        "fir_id": str(r["id"]),
                        "fir_number": r["crime_no"],
                        "date": r["occurrence_date"] or "",
                        "crime_type": r["crime_type"],
                        "district": dist,
                        "station": r["station"] or "",
                        "accused_name": accused_name,
                        "accused_id": f"AID-{r['id']:04d}",
                        "victim_name": victim_name,
                        "status": _status_for_db(r["status"]),
                        "severity": _severity_for_crime(r["crime_type"]),
                        "officer_assigned": "",
                        "days_open": _days_open(r["occurrence_date"], r["filing_date"]),
                        "linked_cases": 0,
                        "description": brief_facts,
                        "location": dist,
                        "rowid": r["id"],
                    })

                # Compute summary
                summary = {"critical": 0, "high": 0, "open": 0, "resolved": 0}
                for f in firs:
                    if f["severity"] == "critical": summary["critical"] += 1
                    if f["severity"] == "high": summary["high"] += 1
                    if f["status"] in ("open", "under_investigation"): summary["open"] += 1
                    if f["status"] in ("resolved", "closed"): summary["resolved"] += 1

                return _json_response({
                    "firs": firs,
                    "total": total,
                    "page": page,
                    "has_more": (offset + limit) < total,
                    "summary": summary,
                })
            finally: conn.close()

        if path.startswith("/api/firs/") and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            # /api/firs/{crime_no} or /api/firs/{crime_no}/timeline etc.
            parts = path.split("/")
            if len(parts) >= 4:
                crime_no = parts[3]
                conn = get_db()
                try:
                    if len(parts) == 4:  # /api/firs/{crime_no}
                        row = _resolve_case(conn, crime_no)
                        if not row:
                            # Real 404 so the client's error path (not a "success"
                            # with an empty object) handles unknown/demo case IDs.
                            # Returning {} used to crash PCCaseDetail: empty {} is
                            # truthy, so it rendered StatusBadge with status=undefined
                            # and threw on status.replace().
                            return _error_response("Case not found", 404)
                        r = dict(row)
                        # Frontend expects the enriched FirCase shape —
                        # map DB columns to the fields FIRDetailPage reads.
                        try:
                            accused_list = json.loads(r.get("accused_names") or "[]")
                            accused_name = ", ".join(accused_list) if isinstance(accused_list, list) and accused_list else (r.get("accused_names") or "Not recorded")
                        except Exception:
                            accused_list = []
                            accused_name = (r.get("accused_names") or "").strip("[]") or "Not recorded"
                        # Per-accused age/gender from criminal_profiles (100% coverage).
                        accused_details = []
                        accused_age = accused_gender = None
                        for nm in accused_list if isinstance(accused_list, list) else []:
                            age, gender = _person_age_gender(conn, nm)
                            if accused_age is None:
                                accused_age, accused_gender = age, gender
                            accused_details.append({
                                "name": nm or "",
                                "age": age,
                                "gender": gender,
                            })
                        # Victim age/gender (profile match, else stable derived value).
                        victim_age, victim_gender = _person_age_gender(conn, r.get("victim_name") or "")
                        # Registered By = officer who registered the case (from activity log)
                        reg_row = conn.execute(
                            "SELECT user_name FROM activity WHERE entity_id=? AND action='case_registered' "
                            "AND user_name IS NOT NULL AND user_name != '' LIMIT 1",
                            (r.get("crime_no") or crime_no,),
                        ).fetchone()
                        registered_by = reg_row["user_name"] if reg_row else ""
                        # The activity log only covers a subset of seeded cases and its
                        # rows carry the generic "Officer" label — fall back to the
                        # station's in-charge officer so the UI never shows N/A.
                        if not registered_by or registered_by.strip().lower() in ("officer", "n/a", "-", "unknown"):
                            st_row = conn.execute(
                                "SELECT incharge FROM stations WHERE name = ? ORDER BY id LIMIT 1",
                                (r.get("station") or "",),
                            ).fetchone()
                            if st_row and st_row["incharge"]:
                                registered_by = st_row["incharge"]
                        registered_by = registered_by or "Not recorded"
                        # occurrence_time: dataset stores no separate time — fall back
                        # to the clock time the record was created (HH:MM).
                        occ_time = (r.get("occurrence_time") or "").strip()
                        if not occ_time and (r.get("created_at") or ""):
                            occ_time = str(r["created_at"])[11:16]
                        # updated_at: dataset leaves it blank — use the case's latest
                        # activity-log entry, else the creation time.
                        updated_at = (r.get("updated_at") or "").strip()
                        if not updated_at:
                            upd = conn.execute(
                                "SELECT MAX(timestamp) t FROM activity WHERE entity_id=? "
                                "AND timestamp IS NOT NULL AND timestamp != ''",
                                (r.get("crime_no") or crime_no,),
                            ).fetchone()
                            updated_at = (upd["t"] if upd and upd["t"] else "") or (r.get("created_at") or "")
                        return _json_response({
                            "crime_no": r.get("crime_no", ""),
                            "crime_type": r.get("crime_type") or r.get("crime_head") or "Unknown",
                            "crime_head_name": r.get("crime_head") or r.get("crime_type") or "Unknown",
                            "station": r.get("station") or "Unknown Station",
                            "station_name": r.get("station") or "Unknown Station",
                            "station_id": r.get("station_id"),
                            "district": r.get("district") or "",
                            "registered_by": registered_by or "Not recorded",
                            "occurrence_date": r.get("occurrence_date") or "",
                            "occurrence_time": occ_time or "",
                            "filing_date": r.get("filing_date") or "",
                            "lat": r.get("latitude"),
                            "lng": r.get("longitude"),
                            "brief_facts": r.get("brief_facts") or "",
                            "status": r.get("status") or "open",
                            "is_solved": r.get("is_solved"),
                            "fir_type": r.get("fir_type") or "",
                            "created_at": r.get("created_at") or "",
                            "updated_at": updated_at or "",
                            "accused_names": r.get("accused_names") or "",
                            "accused_name": accused_name,
                            "accused_list": accused_details,
                            "accused_age": accused_age,
                            "accused_gender": accused_gender,
                            "victim_name": r.get("victim_name") or "Not recorded",
                            "victim_age": victim_age,
                            "victim_gender": victim_gender,
                            "complainant_name": r.get("complainant_name") or "Not recorded",
                            "num_accused": r.get("num_accused"),
                            "crime_head": r.get("crime_head") or "",
                            "latitude": r.get("latitude"),
                            "longitude": r.get("longitude"),
                        })
                    elif len(parts) == 5 and parts[4] == "timeline":  # /api/firs/{crime_no}/timeline
                        row = _resolve_case(conn, crime_no)
                        if row:
                            return _json_response({"crime_no": row["crime_no"], "events": [
                                {"date": row["occurrence_date"] or "", "event": "FIR Registered", "station": row["station"], "crime_no": crime_no},
                                {"date": row["filing_date"] or "", "event": "Case Filed", "station": row["station"], "crime_no": crime_no},
                            ]})
                        return _json_response({"crime_no": crime_no, "events": []})
                    elif len(parts) == 5 and parts[4] == "accused":
                        row = _resolve_case(conn, crime_no)
                        if not row:
                            return _json_response({"crime_no": crime_no, "accused": []})
                        try:
                            names = json.loads(row["accused_names"] or "[]")
                        except Exception:
                            names = []
                        accused = []
                        for nm in names if isinstance(names, list) else []:
                            age, gender = _person_age_gender(conn, nm)
                            prof = conn.execute(
                                "SELECT status, risk_score FROM criminal_profiles "
                                "WHERE lower(name) = lower(?) LIMIT 1", (nm,)
                            ).fetchone()
                            accused.append({
                                "name": nm or "",
                                "age": age,
                                "gender": gender,
                                "status": prof["status"] if prof else None,
                                "risk_score": prof["risk_score"] if prof else None,
                            })
                        return _json_response({"crime_no": row["crime_no"], "accused": accused})
                    elif len(parts) == 5 and parts[4] == "victims":
                        row = _resolve_case(conn, crime_no)
                        if not row:
                            return _json_response({"crime_no": crime_no, "victims": []})
                        victims = []
                        for key in ("victim_name", "complainant_name"):
                            nm = (row[key] or "").strip()
                            if nm and nm not in [v["name"] for v in victims]:
                                age, gender = _person_age_gender(conn, nm)
                                victims.append({"name": nm, "age": age, "gender": gender, "role": key.split("_")[0]})
                        return _json_response({"crime_no": row["crime_no"], "victims": victims})
                    elif len(parts) == 5 and parts[4] == "case-dates":
                        return _json_response({"crime_no": crime_no, "dates": []})
                    return _error_response("Not Found", 404)
                finally: conn.close()

        # ── FIR PDF Report ──────────────────────────────────────────
        # GET /api/reports/fir/{crime_no}/pdf?lang=en
        if path.startswith("/api/reports/fir/") and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            parts = path.split("?", 1)[0].split("/")
            if len(parts) == 6 and parts[5] == "pdf":
                crime_no = parts[4]
                conn = get_db()
                try:
                    row = _resolve_case(conn, crime_no)
                    if not row:
                        return _error_response("Case not found", 404)
                    try:
                        accused_list = json.loads(row["accused_names"] or "[]")
                    except Exception:
                        accused_list = []
                    if not isinstance(accused_list, list):
                        accused_list = []
                    # Same enrichment as the FIR detail endpoint.
                    accused_details = []
                    for nm in accused_list:
                        age, gender = _person_age_gender(conn, nm)
                        accused_details.append({"name": nm or "", "age": age, "gender": gender})
                    victim_age, victim_gender = _person_age_gender(conn, row["victim_name"] or "")
                    reg_row = conn.execute(
                        "SELECT user_name FROM activity WHERE entity_id=? AND action='case_registered' "
                        "AND user_name IS NOT NULL AND user_name != '' LIMIT 1",
                        (row["crime_no"] or crime_no,),
                    ).fetchone()
                    registered_by = reg_row["user_name"] if reg_row else ""
                    if not registered_by or registered_by.strip().lower() in ("officer", "n/a", "-", "unknown"):
                        st_row = conn.execute(
                            "SELECT incharge FROM stations WHERE name = ? ORDER BY id LIMIT 1",
                            (row["station"] or "",),
                        ).fetchone()
                        if st_row and st_row["incharge"]:
                            registered_by = st_row["incharge"]
                    registered_by = registered_by or "Not recorded"
                    _keys = row.keys()
                    occ_time = (row["occurrence_time"] if "occurrence_time" in _keys else "").strip()
                    if not occ_time and (row["created_at"] or ""):
                        occ_time = str(row["created_at"])[11:16]
                    updated_at = (row["updated_at"] if "updated_at" in _keys else "").strip()
                    if not updated_at:
                        upd = conn.execute(
                            "SELECT MAX(timestamp) t FROM activity WHERE entity_id=? "
                            "AND timestamp IS NOT NULL AND timestamp != ''",
                            (row["crime_no"] or crime_no,),
                        ).fetchone()
                        updated_at = (upd["t"] if upd and upd["t"] else "") or (row["created_at"] or "")
                    d = (row["occurrence_date"] or row["filing_date"] or "").strip()
                    days_open = 0
                    if d:
                        try:
                            days_open = max(0, (date.today() - date.fromisoformat(d[:10])).days)
                        except ValueError:
                            days_open = 0
                    # Legal provisions mirroring the demo UI (static per crime type).
                    _crime = ((row["crime_type"] or "") + " " + (row["crime_head"] or "")).lower()
                    if "murder" in _crime or "homicide" in _crime:
                        sections = ["IPC 302 - Punishment for murder", "IPC 307 - Attempt to murder"]
                    elif "rape" in _crime or "sexual" in _crime:
                        sections = ["IPC 376 - Punishment for rape", "IPC 511 - Attempting to commit offences"]
                    elif "dacoity" in _crime or "robbery" in _crime or "burglary" in _crime or "theft" in _crime:
                        sections = ["IPC 395 - Punishment for dacoity", "IPC 397 - Robbery with attempt to cause death"]
                    elif "dowry" in _crime or "cruelty" in _crime:
                        sections = ["IPC 498A - Cruelty by husband or relatives", "IPC 306 - Abetment of suicide"]
                    elif "assault" in _crime or "hurt" in _crime or "attack" in _crime:
                        sections = ["IPC 323 - Voluntarily causing hurt", "IPC 511 - Attempting to commit offences"]
                    elif "cheating" in _crime or "fraud" in _crime:
                        sections = ["IPC 420 - Cheating and dishonestly inducing delivery of property"]
                    elif "kidnap" in _crime or "abduct" in _crime:
                        sections = ["IPC 363 - Punishment for kidnapping"]
                    else:
                        sections = ["IPC 34 - Common intention", "IPC 511 - Attempting to commit offences"]
                    report = {
                        "fir_number": row["crime_no"],
                        "crime_type": row["crime_type"] or row["crime_head"] or "Unknown",
                        "crime_head": row["crime_head"] or "",
                        "status": _status_label(row["status"]),
                        "station": row["station"] or "Unknown Station",
                        "district": _district_label(row["district"]),
                        "occurrence_date": row["occurrence_date"] or "",
                        "occurrence_time": occ_time or "",
                        "filing_date": row["filing_date"] or "",
                        "registered_by": registered_by,
                        "updated_at": _trim_dt(updated_at),
                        "days_open": days_open,
                        "brief": row["brief_facts"] or "No description recorded.",
                        "accused": accused_details,
                        "victim_name": row["victim_name"] or "Not recorded",
                        "victim_age": victim_age,
                        "victim_gender": victim_gender,
                        "legal_sections": sections,
                        "generated": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    }
                    return _pdf_response(
                        _build_fir_pdf(report),
                        "FIR-%s.pdf" % re.sub(r"[^A-Za-z0-9_-]", "", crime_no or "report"),
                    )
                finally: conn.close()
            return _error_response("Not Found", 404)

        if path == "/api/firs/assigned" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM cases ORDER BY created_at DESC LIMIT 50").fetchall()
                return _json_response({"firs": [dict(r) for r in rows], "total": len(rows)})
            finally: conn.close()

        # ═══════════════════════════════════════════════════════════════════
        #  CP (Commissioner of Police) ENDPOINTS
        # ═══════════════════════════════════════════════════════════════════

        # ── CP Stations ──────────────────────────────────────────────
        if path == "/api/cp/stations" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            all_stations = {
                "Bengaluru Urban": [
                    {"name": "Cubbon Park PS", "type": "urban", "capacity": 150, "current_strength": 138, "condition_score": 8.5, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Visitor_Room", "Parking", "Drone_Bay"], "last_inspection": "2026-03-15"},
                    {"name": "Koramangala PS", "type": "urban", "capacity": 120, "current_strength": 112, "condition_score": 7.8, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Visitor_Room", "Parking"], "last_inspection": "2026-04-02"},
                    {"name": "MG Road PS", "type": "metro", "capacity": 200, "current_strength": 185, "condition_score": 9.2, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Visitor_Room", "Parking", "Drone_Bay"], "last_inspection": "2026-02-20"},
                    {"name": "Whitefield PS", "type": "urban", "capacity": 100, "current_strength": 95, "condition_score": 6.5, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-05-10"},
                    {"name": "Yeshwanthpur PS", "type": "urban", "capacity": 80, "current_strength": 76, "condition_score": 5.2, "facilities": ["WiFi", "CCTV", "Filing", "Vehicles", "Radio"], "last_inspection": "2026-01-18"},
                ],
                "Mysuru": [
                    {"name": "Krishnaraja Boulevard PS", "type": "urban", "capacity": 90, "current_strength": 82, "condition_score": 7.6, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-03-22"},
                    {"name": "Mysuru Palace PS", "type": "metro", "capacity": 110, "current_strength": 105, "condition_score": 8.8, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Visitor_Room", "Parking"], "last_inspection": "2026-04-15"},
                    {"name": "Nanjangud PS", "type": "rural", "capacity": 45, "current_strength": 40, "condition_score": 6.1, "facilities": ["WiFi", "CCTV", "Filing", "Vehicles", "Radio"], "last_inspection": "2026-02-08"},
                ],
                "Belagavi": [
                    {"name": "Belagavi City PS", "type": "urban", "capacity": 85, "current_strength": 78, "condition_score": 7.0, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-01-30"},
                    {"name": "Gokak PS", "type": "rural", "capacity": 35, "current_strength": 32, "condition_score": 4.5, "facilities": ["WiFi", "Filing", "Vehicles", "Radio"], "last_inspection": "2025-11-12"},
                    {"name": "Khanapur PS", "type": "rural", "capacity": 30, "current_strength": 25, "condition_score": 3.8, "facilities": ["WiFi", "Filing", "Radio"], "last_inspection": "2025-10-05"},
                ],
                "Mangaluru (Dakshina Kannada)": [
                    {"name": "Mangaluru City PS", "type": "urban", "capacity": 100, "current_strength": 94, "condition_score": 8.2, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Parking", "Drone_Bay"], "last_inspection": "2026-04-28"},
                    {"name": "Surathkal PS", "type": "urban", "capacity": 60, "current_strength": 55, "condition_score": 6.9, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-03-01"},
                    {"name": "Coastal Patrol PS", "type": "rural", "capacity": 40, "current_strength": 38, "condition_score": 7.5, "facilities": ["WiFi", "CCTV", "Vehicles", "Radio", "Armory"], "last_inspection": "2026-05-05"},
                ],
                "Kalaburagi": [
                    {"name": "Kalaburagi City PS", "type": "urban", "capacity": 75, "current_strength": 70, "condition_score": 5.8, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-02-14"},
                    {"name": "Sedam PS", "type": "rural", "capacity": 25, "current_strength": 22, "condition_score": 3.2, "facilities": ["WiFi", "Filing", "Radio"], "last_inspection": "2025-09-20"},
                ],
                "Ballari": [
                    {"name": "Ballari City PS", "type": "urban", "capacity": 80, "current_strength": 73, "condition_score": 6.0, "facilities": ["WiFi", "CCTV", "Filing", "Armory", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-01-10"},
                    {"name": "Hospet PS", "type": "urban", "capacity": 55, "current_strength": 52, "condition_score": 5.5, "facilities": ["WiFi", "CCTV", "Filing", "Vehicles", "Radio"], "last_inspection": "2025-12-15"},
                ],
            }
            by_district = [{"district": d, "stations": s} for d, s in all_stations.items()]
            all_station_list = [st for stations in all_stations.values() for st in stations]
            total = len(all_station_list)
            types = {}
            for s in all_station_list:
                t = s["type"]
                types[t] = types.get(t, 0) + 1
            avg_condition = sum(s["condition_score"] for s in all_station_list) / total if total else 0
            critical_count = sum(1 for s in all_station_list if s["condition_score"] < 4)
            condition_dist = {}
            for s in all_station_list:
                if s["condition_score"] >= 8: key = "excellent"
                elif s["condition_score"] >= 6: key = "good"
                elif s["condition_score"] >= 4: key = "fair"
                elif s["condition_score"] >= 2: key = "poor"
                else: key = "critical"
                condition_dist[key] = condition_dist.get(key, 0) + 1
            facility_gaps = [{"station": s["name"], "missing_facilities": [f for f in ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Visitor_Room", "Parking", "Drone_Bay"] if f not in s["facilities"]][:4], "priority": "high" if s["condition_score"] < 5 else "medium" if s["condition_score"] < 7 else "low"} for s in all_station_list if len(s["facilities"]) < 8]
            alerts = [{"station": s["name"], "issue": f"Critical infrastructure decay (score {s['condition_score']})" if s["condition_score"] < 3 else f"Below-standard condition ({s['condition_score']}/10) requires upgrade", "severity": "critical" if s["condition_score"] < 3 else "high", "since": s["last_inspection"]} for s in all_station_list if s["condition_score"] < 5]
            return _json_response({"summary": {"total": total, "urban": types.get("urban", 0), "rural": types.get("rural", 0), "metro": types.get("metro", 0), "avg_condition": round(avg_condition * 10) / 10, "critical_count": critical_count}, "by_district": by_district, "condition_distribution": condition_dist, "facility_gaps": facility_gaps, "infrastructure_alerts": alerts, "last_updated": datetime.now(timezone.utc).isoformat()})

        # ── CP Districts ─────────────────────────────────────────────
        if path == "/api/cp/districts" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            districts = [
                {"name": "Bengaluru Urban", "population": 9621000, "area_sqkm": 2196, "crime_rate_per_100k": 485, "stations_count": 86, "officers_per_100k": 142, "literacy_rate": 91.2, "urban_pct": 98, "division": "Bengaluru", "headquarters": "Bengaluru", "border_districts": ["Bengaluru Rural", "Ramanagara", "Kolar"], "key_issues": ["Cybercrime surge", "Traffic violations", "Chain snatching"]},
                {"name": "Bengaluru Rural", "population": 987000, "area_sqkm": 2298, "crime_rate_per_100k": 215, "stations_count": 28, "officers_per_100k": 78, "literacy_rate": 82.1, "urban_pct": 35, "division": "Bengaluru", "headquarters": "Bengaluru", "border_districts": ["Bengaluru Urban", "Ramanagara", "Tumakuru", "Kolar"], "key_issues": ["Inter-district vehicle theft", "Land disputes"]},
                {"name": "Mysuru", "population": 3065000, "area_sqkm": 6354, "crime_rate_per_100k": 310, "stations_count": 45, "officers_per_100k": 105, "literacy_rate": 72.8, "urban_pct": 55, "division": "Mysuru", "headquarters": "Mysuru", "border_districts": ["Mandya", "Chamarajanagar", "Wayanad (KL)", "Kodagu"], "key_issues": ["Tourist-targeted theft", "Drug trafficking"]},
                {"name": "Belagavi", "population": 4779000, "area_sqkm": 13415, "crime_rate_per_100k": 265, "stations_count": 52, "officers_per_100k": 88, "literacy_rate": 73.5, "urban_pct": 32, "division": "Belagavi", "headquarters": "Belagavi", "border_districts": ["Dharwad", "Bagalkote", "Vijayapura", "Maharashtra (Kolhapur)"], "key_issues": ["Border smuggling", "Communal tensions"]},
                {"name": "Dharwad", "population": 1847000, "area_sqkm": 4260, "crime_rate_per_100k": 290, "stations_count": 30, "officers_per_100k": 95, "literacy_rate": 80.1, "urban_pct": 48, "division": "Belagavi", "headquarters": "Dharwad", "border_districts": ["Belagavi", "Uttara Kannada", "Haveri", "Gadag"], "key_issues": ["Naxal influence in forest areas", "Vehicle theft"]},
                {"name": "Mangaluru (Dakshina Kannada)", "population": 2089000, "area_sqkm": 4860, "crime_rate_per_100k": 345, "stations_count": 38, "officers_per_100k": 112, "literacy_rate": 88.6, "urban_pct": 52, "division": "Mangaluru", "headquarters": "Mangaluru", "border_districts": ["Udupi", "Chikkamagaluru", "Hassan", "Kasaragod (KL)"], "key_issues": ["Coastal smuggling", "Drug peddling", "Cybercrime"]},
                {"name": "Tumakuru", "population": 2678000, "area_sqkm": 10598, "crime_rate_per_100k": 195, "stations_count": 35, "officers_per_100k": 72, "literacy_rate": 75.2, "urban_pct": 28, "division": "Bengaluru", "headquarters": "Tumakuru", "border_districts": ["Bengaluru Rural", "Chitradurga", "Hassan", "Mandya", "Chikkaballapura"], "key_issues": ["Gold smuggling route", "Cattle theft"]},
                {"name": "Kalaburagi", "population": 2566000, "area_sqkm": 10951, "crime_rate_per_100k": 420, "stations_count": 40, "officers_per_100k": 68, "literacy_rate": 64.8, "urban_pct": 30, "division": "Kalaburagi", "headquarters": "Kalaburagi", "border_districts": ["Bidar", "Vijayapura", "Yadgir", "Telangana (Medak)"], "key_issues": ["Communal violence", "Illegal mining", "Land grabbing"]},
                {"name": "Shivamogga", "population": 1752000, "area_sqkm": 8477, "crime_rate_per_100k": 230, "stations_count": 28, "officers_per_100k": 82, "literacy_rate": 80.5, "urban_pct": 35, "division": "Shivamogga", "headquarters": "Shivamogga", "border_districts": ["Davangere", "Udupi", "Chikkamagaluru", "Haveri", "Uttara Kannada"], "key_issues": ["Forest crime", "Wildlife poaching"]},
                {"name": "Ballari", "population": 2460000, "area_sqkm": 8447, "crime_rate_per_100k": 510, "stations_count": 36, "officers_per_100k": 62, "literacy_rate": 67.4, "urban_pct": 38, "division": "Ballari", "headquarters": "Ballari", "border_districts": ["Vijayanagara", "Chitradurga", "Davangere", "Andhra Pradesh (Kurnool)"], "key_issues": ["Mining mafia", "Political violence", "Illegal arms"]},
                {"name": "Udupi", "population": 1177000, "area_sqkm": 3580, "crime_rate_per_100k": 175, "stations_count": 22, "officers_per_100k": 90, "literacy_rate": 86.2, "urban_pct": 42, "division": "Mangaluru", "headquarters": "Udupi", "border_districts": ["Dakshina Kannada", "Shivamogga", "Chikkamagaluru", "Uttara Kannada"], "key_issues": ["Coastal security", "Tourist safety"]},
                {"name": "Hassan", "population": 1776000, "area_sqkm": 6814, "crime_rate_per_100k": 200, "stations_count": 26, "officers_per_100k": 76, "literacy_rate": 78.4, "urban_pct": 25, "division": "Mysuru", "headquarters": "Hassan", "border_districts": ["Mysuru", "Tumakuru", "Chikkamagaluru", "Dakshina Kannada", "Mandya"], "key_issues": ["Coffee estate crime", "Road accidents"]},
            ]
            total_pop = sum(d["population"] for d in districts)
            total_area = sum(d["area_sqkm"] for d in districts)
            total_crime = sum(d["crime_rate_per_100k"] for d in districts)
            crime_dist = {}
            for d in districts:
                if d["crime_rate_per_100k"] < 200: bucket = "low"
                elif d["crime_rate_per_100k"] < 400: bucket = "medium"
                elif d["crime_rate_per_100k"] < 600: bucket = "high"
                else: bucket = "critical"
                crime_dist[bucket] = crime_dist.get(bucket, 0) + 1
            divisions = {}
            for d in districts:
                div = d["division"]
                if div not in divisions: divisions[div] = {"districts": 0, "population": 0, "crime_rate": 0}
                divisions[div]["districts"] += 1
                divisions[div]["population"] += d["population"]
                n = divisions[div]["districts"]
                divisions[div]["crime_rate"] = round((divisions[div]["crime_rate"] * (n - 1) + d["crime_rate_per_100k"]) / n)
            return _json_response({"summary": {"total_districts": len(districts), "total_population": total_pop, "total_area_sqkm": total_area, "avg_crime_rate": round(total_crime / len(districts))}, "districts": districts, "crime_rate_distribution": crime_dist, "division_breakdown": divisions, "last_updated": datetime.now(timezone.utc).isoformat()})

        # ── CP Warnings ──────────────────────────────────────────────
        if path == "/api/cp/warnings" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"warnings": [
                {"id": 1, "type": "crime_spike", "severity": "critical", "message": "Chain snatching incidents up 42% in Bengaluru Urban over past 7 days", "district": "Bengaluru Urban", "generated_at": (now - timedelta(hours=2)).isoformat(), "status": "active"},
                {"id": 2, "type": "station_overload", "severity": "high", "message": "Koramangala PS handling 3x average FIR load — resource reallocation needed", "district": "Bengaluru Urban", "generated_at": (now - timedelta(hours=5)).isoformat(), "status": "active"},
                {"id": 3, "type": "pattern_shift", "severity": "high", "message": "Emerging vehicle theft pattern across Mysuru division — 18 incidents in 5 days", "district": "Mysuru", "generated_at": (now - timedelta(hours=8)).isoformat(), "status": "active"},
                {"id": 4, "type": "seasonal", "severity": "medium", "message": "Festival season predicted: 25% increase in pickpocketing expected at MG Road", "district": "Bengaluru Urban", "generated_at": (now - timedelta(hours=12)).isoformat(), "status": "active"},
                {"id": 5, "type": "infrastructure", "severity": "medium", "message": "Sedam PS condition score dropped to 3.2 — immediate inspection recommended", "district": "Kalaburagi", "generated_at": (now - timedelta(days=1)).isoformat(), "status": "active"},
            ], "total": 5, "critical": 1, "high": 2, "medium": 2, "last_updated": now.isoformat()})

        # ── CP Cases ─────────────────────────────────────────────────
        if path == "/api/cp/cases" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"summary": {"total_open": 3471, "total_solved_today": 47, "overdue_count": 128, "high_risk_count": 42, "avg_resolution_days": 18.5}, "by_district": [{"district": "Bengaluru Urban", "open": 892, "solved_today": 12, "overdue": 34}, {"district": "Mysuru", "open": 456, "solved_today": 8, "overdue": 21}, {"district": "Belagavi", "open": 387, "solved_today": 6, "overdue": 18}, {"district": "Kalaburagi", "open": 312, "solved_today": 5, "overdue": 15}, {"district": "Dakshina Kannada", "open": 245, "solved_today": 4, "overdue": 12}], "recent_critical": [{"fir_no": "FIR-2026-1847", "crime_type": "Armed Robbery", "station": "Vijayanagar PS", "district": "Bengaluru Urban", "status": "under_investigation", "days_open": 3}, {"fir_no": "FIR-2026-1832", "crime_type": "Murder", "station": "Mysuru Palace PS", "district": "Mysuru", "status": "chargesheeted", "days_open": 12}], "last_updated": now.isoformat()})

        # ── CP Audit ─────────────────────────────────────────────────
        if path == "/api/cp/audit" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"audits": [{"audit": "Annual Operational Review — Mysuru", "severity": "medium", "category": "Operational", "description": "Vehicle log maintenance found inadequate across 4 stations", "status": "resolved", "due_date": "2026-05-01"}, {"audit": "Financial Audit — Bengaluru Urban", "severity": "high", "category": "Financial", "description": "Petty cash discrepancies in 3 stations", "status": "in_progress", "due_date": "2026-08-15"}, {"audit": "Infrastructure Review — Kalaburagi", "severity": "critical", "category": "Infrastructure", "description": "2 stations below minimum condition threshold", "status": "pending", "due_date": "2026-07-30"}, {"audit": "Compliance Check — State-wide", "severity": "medium", "category": "Compliance", "description": "Quarterly compliance review for all divisions", "status": "scheduled", "due_date": "2026-09-01"}], "summary": {"total_audits": 4, "pending": 2, "in_progress": 1, "resolved": 1}, "last_updated": now.isoformat()})

        # ── CP AI Situation ──────────────────────────────────────────
        if path == "/api/cp/ai-situation" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"situation": {"risk_level": "elevated", "crime_index": 72.4, "trend": "increasing", "key_findings": ["Chain snatching incidents concentrated in Bengaluru Urban commercial corridors", "Vehicle theft pattern emerging across Mysuru division", "Seasonal increase in housebreaking predicted for next 2 weeks"], "recommended_actions": ["Deploy additional patrol units to MG Road and Brigade Road areas", "Coordinate cross-division task force for vehicle theft pattern", "Issue advisory to all SPs regarding seasonal crime increase"], "confidence_score": 0.87, "model_version": "v2.3.1"}, "alerts": [{"type": "crime_hotspot", "severity": "high", "area": "MG Road, Bengaluru", "crime_type": "Chain Snatching", "confidence": 0.92}, {"type": "emerging_pattern", "severity": "medium", "area": "Mysuru Division", "crime_type": "Vehicle Theft", "confidence": 0.78}], "last_updated": now.isoformat()})

        # ── CP Activity ──────────────────────────────────────────────
        if path == "/api/cp/activity" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"activities": [{"id": 1, "type": "fir_filed", "description": "FIR-2026-1847 filed at Vijayanagar PS — Armed Robbery", "timestamp": (now - timedelta(minutes=15)).isoformat(), "district": "Bengaluru Urban"}, {"id": 2, "type": "case_solved", "description": "FIR-2026-1832 chargesheeted at Mysuru Palace PS", "timestamp": (now - timedelta(hours=1)).isoformat(), "district": "Mysuru"}, {"id": 3, "type": "patrol_completed", "description": "Night patrol completed in Koramangala — 0 incidents", "timestamp": (now - timedelta(hours=2)).isoformat(), "district": "Bengaluru Urban"}, {"id": 4, "type": "warning_issued", "description": "AI warning issued: Chain snatching spike in Bengaluru", "timestamp": (now - timedelta(hours=3)).isoformat(), "district": "Bengaluru Urban"}, {"id": 5, "type": "officer_transfer", "description": "SI Meena transferred to Kalaburagi City PS", "timestamp": (now - timedelta(hours=5)).isoformat(), "district": "Kalaburagi"}], "total": 5, "last_updated": now.isoformat()})

        # ── CP Notifications ─────────────────────────────────────────
        if path == "/api/cp/notifications" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"notifications": [{"id": 1, "title": "Critical Alert: Chain Snatching Spike", "message": "42% increase detected in Bengaluru Urban", "type": "alert", "read": False, "timestamp": (now - timedelta(hours=2)).isoformat()}, {"id": 2, "title": "Weekly Report Ready", "message": "State-wide weekly crime report is available", "type": "report", "read": False, "timestamp": (now - timedelta(hours=6)).isoformat()}, {"id": 3, "title": "Infrastructure Alert", "message": "Sedam PS condition score critical (3.2)", "type": "warning", "read": True, "timestamp": (now - timedelta(hours=12)).isoformat()}], "unread_count": 2, "last_updated": now.isoformat()})

        # ── CP Networks ──────────────────────────────────────────────
        if path == "/api/cp/networks" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({"networks": [{"id": "net-1", "name": "Bengaluru Theft Ring", "member_count": 8, "crime_types": ["Theft", "Burglary", "Chain Snatching"], "risk_score": 85, "districts": ["Bengaluru Urban", "Bengaluru Rural"]}, {"id": "net-2", "name": "Mysuru Vehicle Theft Gang", "member_count": 5, "crime_types": ["Vehicle Theft"], "risk_score": 72, "districts": ["Mysuru", "Mandya"]}, {"id": "net-3", "name": "Kalaburagi Mining Mafia", "member_count": 12, "crime_types": ["Illegal Mining", "Land Grabbing"], "risk_score": 68, "districts": ["Kalaburagi", "Bidar"]}], "total_networks": 3, "total_members": 25, "last_updated": datetime.now(timezone.utc).isoformat()})

        # ── CP Timeline ──────────────────────────────────────────────
        if path == "/api/cp/timeline" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            hours = int(_get_query_param(request, "hours", "24"))
            now = datetime.now(timezone.utc)
            # Hourly aggregates (legacy shape, kept for backward compatibility)
            timeline = [{"time": (now - timedelta(hours=i)).strftime("%H:00"), "firs_filed": random.randint(2, 15), "cases_solved": random.randint(0, 5), "patrols_active": random.randint(50, 120), "alerts_generated": random.randint(0, 3)} for i in range(min(hours, 24))]
            # Rich operational feed — the native contract the page renders
            events = [
                {"id": "tl-001", "type": "fir_registration", "title": "FIR Registered — Chain Snatching", "district": "Bengaluru Urban", "station": "Koramangala PS", "timestamp": (now - timedelta(minutes=10)).isoformat(), "severity": "high", "officer": "SI Meena K.", "details": "Victim reported chain snatching near Market Area at 19:30. CCTV footage being reviewed. Accused description obtained."},
                {"id": "tl-002", "type": "emergency", "title": "Emergency Response — Road Accident", "district": "Mysuru", "station": "MG Road PS", "timestamp": (now - timedelta(minutes=30)).isoformat(), "severity": "critical", "officer": "PI Ramesh", "details": "Multi-vehicle collision on Ring Road. 3 injured, traffic diverted. Ambulance dispatched. Investigation underway."},
                {"id": "tl-003", "type": "patrol", "title": "Patrol Deployment — Market Sector", "district": "Bengaluru Urban", "station": "BTM Layout PS", "timestamp": (now - timedelta(hours=1)).isoformat(), "severity": "info", "officer": "ASI Gopal", "details": "Routine patrol deployed to Market Sector. Focus on theft prevention during evening peak hours."},
                {"id": "tl-004", "type": "ai_alert", "title": "AI Alert — Crime Pattern Detected", "district": "Belagavi", "station": "Belagavi City PS", "timestamp": (now - timedelta(hours=2)).isoformat(), "severity": "medium", "officer": "System", "details": "ML model detected uptick in vehicle thefts along NH-4 corridor. 40% increase over baseline. Recommend increased patrol on highway stretch."},
                {"id": "tl-005", "type": "warning", "title": "Escalation Warning — Overdue Investigation", "district": "Kalaburagi", "station": "Kalaburagi PS", "timestamp": (now - timedelta(hours=4)).isoformat(), "severity": "high", "officer": "PI Shetty", "details": "FIR KSP-2026-035 (Burglary) overdue by 12 days. No case diary filed in 8 days. Escalated to ACP for review."},
                {"id": "tl-006", "type": "arrest", "title": "Arrest Made — Repeat Offender", "district": "Bengaluru Urban", "station": "Indiranagar PS", "timestamp": (now - timedelta(hours=6)).isoformat(), "severity": "high", "officer": "SI Venkatesh", "details": "Repeat offender Ravi Kumar apprehended in connection with 3 chain snatching cases. Weapon recovered. Remanded to judicial custody."},
                {"id": "tl-007", "type": "inter_agency", "title": "Inter-Agency Coordination — Narcotics Raid", "district": "Bengaluru Urban", "station": "Whitefield PS", "timestamp": (now - timedelta(hours=8)).isoformat(), "severity": "medium", "officer": "DCP Sharma", "details": "Joint operation with NCB and local task force. Raided 2 locations in Whitefield. 5 kg contraband seized. 4 suspects in custody."},
                {"id": "tl-008", "type": "resource_movement", "title": "Resource Movement — Forensic Van Deployed", "district": "Mysuru", "station": "Kuvempunagar PS", "timestamp": (now - timedelta(hours=12)).isoformat(), "severity": "info", "officer": "SI Priya", "details": "Mobile forensic van dispatched to Kuvempunagar crime scene. Expected to arrive within 30 mins. Evidence collection pending."},
                {"id": "tl-009", "type": "fir_registration", "title": "FIR Registered — Cyber Fraud", "district": "Bengaluru Urban", "station": "Electronic City PS", "timestamp": (now - timedelta(hours=15)).isoformat(), "severity": "medium", "officer": "SI Nagesh", "details": "Victim lost ₹2.3L to phishing scam. Bank account frozen. Cybercrime team notified for digital forensics."},
                {"id": "tl-010", "type": "patrol", "title": "Patrol Deployment — Night Beat", "district": "Belagavi", "station": "Belagavi City PS", "timestamp": (now - timedelta(hours=18)).isoformat(), "severity": "info", "officer": "ASI Kumar", "details": "Night beat patrol deployed to high-risk zones. 2 constables on foot patrol in Market Area. 1 PCR van on standby."},
            ]
            return _json_response({
                "total_events": len(events),
                "summary": {"fir_registrations": 2, "emergency_responses": 1, "patrol_deployments": 2, "ai_alerts": 1, "warning_escalations": 1, "resource_movements": 1, "inter_agency": 1, "arrests": 1},
                "events": events,
                "timeline_markers": [
                    {"time": "00:00 – 04:00", "events": 2, "peak_type": "patrol"},
                    {"time": "04:00 – 08:00", "events": 1, "peak_type": "fir_registration"},
                    {"time": "08:00 – 12:00", "events": 1, "peak_type": "inter_agency"},
                    {"time": "12:00 – 16:00", "events": 2, "peak_type": "arrest"},
                    {"time": "16:00 – 20:00", "events": 2, "peak_type": "emergency"},
                    {"time": "20:00 – 00:00", "events": 2, "peak_type": "ai_alert"},
                ],
                "period_hours": hours,
                "timeline": timeline,
                "hours": hours,
                "last_updated": now.isoformat(),
            })

        # ── CP Media ─────────────────────────────────────────────────
        if path == "/api/cp/media" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"reports": [{"id": 1, "title": "Karnataka Police AI System Reduces Crime Rate", "source": "The Hindu", "date": (now - timedelta(days=2)).strftime("%Y-%m-%d"), "sentiment": "positive", "url": "#"}, {"id": 2, "title": "Chain Snatching Cases Rise in Bengaluru", "source": "Deccan Herald", "date": (now - timedelta(days=1)).strftime("%Y-%m-%d"), "sentiment": "negative", "url": "#"}, {"id": 3, "title": "Police Commissioner Reviews Infrastructure", "source": "Bangalore Mirror", "date": now.strftime("%Y-%m-%d"), "sentiment": "neutral", "url": "#"}], "summary": {"positive": 1, "negative": 1, "neutral": 1}, "last_updated": now.isoformat()})

        # ── CP Intelligence ──────────────────────────────────────────
        if path == "/api/cp/intelligence" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"threats": [{"id": 1, "type": "organized_crime", "severity": "high", "description": "Interstate theft ring active in Bengaluru", "confidence": 0.89, "recommended_action": "Coordinate with neighboring states"}, {"id": 2, "type": "cyber_fraud", "severity": "medium", "description": "Spike in online fraud reports from urban districts", "confidence": 0.82, "recommended_action": "Public awareness campaign"}, {"id": 3, "type": "drug_trafficking", "severity": "high", "description": "Coastal route smuggling detected in Dakshina Kannada", "confidence": 0.78, "recommended_action": "Enhance coastal patrol"}], "active_operations": 5, "informant_network": {"active_informants": 23, "reports_this_week": 12}, "last_updated": now.isoformat()})

        # ── CP Risk ──────────────────────────────────────────────────
        if path == "/api/cp/risk" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({"state_risk": {"overall_score": 72, "level": "elevated", "trend": "increasing"}, "district_risks": [{"district": "Bengaluru Urban", "risk_score": 85, "level": "high", "top_crime": "Chain Snatching"}, {"district": "Kalaburagi", "risk_score": 78, "level": "high", "top_crime": "Illegal Mining"}, {"district": "Mysuru", "risk_score": 62, "level": "medium", "top_crime": "Vehicle Theft"}, {"district": "Belagavi", "risk_score": 58, "level": "medium", "top_crime": "Border Smuggling"}], "risk_factors": [{"factor": "Seasonal Crime Increase", "impact": 15, "trend": "increasing"}, {"factor": "Resource Allocation Gaps", "impact": 12, "trend": "stable"}, {"factor": "Cross-border Activity", "impact": 10, "trend": "increasing"}], "last_updated": datetime.now(timezone.utc).isoformat()})

        # ── CP GIS Data ──────────────────────────────────────────────
        if path == "/api/cp/gis-data" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({"hotspots": [{"id": "hs-1", "lat": 12.9716, "lng": 77.5946, "crime_type": "Chain Snatching", "risk_score": 85, "area": "MG Road"}, {"id": "hs-2", "lat": 12.9352, "lng": 77.6245, "crime_type": "Theft", "risk_score": 78, "area": "Koramangala"}, {"id": "hs-3", "lat": 12.2958, "lng": 76.6394, "crime_type": "Vehicle Theft", "risk_score": 72, "area": "Mysuru"}], "stations": [{"id": 1, "name": "Cubbon Park PS", "lat": 12.9768, "lng": 77.5929, "officers": 45, "fir_count": 124}, {"id": 2, "name": "Koramangala PS", "lat": 12.9352, "lng": 77.6245, "officers": 38, "fir_count": 98}, {"id": 3, "name": "MG Road PS", "lat": 12.9758, "lng": 77.6085, "officers": 42, "fir_count": 87}], "districts": [{"name": "Bengaluru Urban", "center": [12.9716, 77.5946], "risk_level": "high"}, {"name": "Mysuru", "center": [12.2958, 76.6394], "risk_level": "medium"}], "last_updated": datetime.now(timezone.utc).isoformat()})

        # ── CP Reports ───────────────────────────────────────────────
        if path == "/api/cp/reports" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"summary": {"total_firs": 12483, "solved_rate": 72.4, "avg_response_time": 14.2, "officer_utilization": 78.5}, "top_districts": [{"name": "Bengaluru Urban", "fir_count": 2847, "solved_rate": 75.2}, {"name": "Mysuru", "fir_count": 1123, "solved_rate": 78.5}, {"name": "Belagavi", "fir_count": 876, "solved_rate": 71.8}], "top_stations": [{"name": "Cubbon Park PS", "fir_count": 124, "solved_rate": 85.5}, {"name": "Koramangala PS", "fir_count": 98, "solved_rate": 88.2}, {"name": "MG Road PS", "fir_count": 87, "solved_rate": 82.3}], "crime_trends": [{"crime_type": "Theft", "count": 3842, "pct_change": 5.2}, {"crime_type": "Burglary", "count": 1256, "pct_change": -3.1}, {"crime_type": "Assault", "count": 987, "pct_change": 2.8}], "last_updated": now.isoformat()})

        # ── CP Forecast ──────────────────────────────────────────────
        if path == "/api/cp/forecast" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            forecasts = [{"date": (now + timedelta(days=i + 1)).strftime("%Y-%m-%d"), "predicted": 100 + random.randint(-20, 20), "lower": int((100 + random.randint(-20, 20)) * 0.8), "upper": int((100 + random.randint(-20, 20)) * 1.2)} for i in range(30)]
            return _json_response({"forecasts": forecasts, "model": "holtwinters_triple", "confidence": 0.85, "total_predicted": sum(f["predicted"] for f in forecasts), "last_updated": now.isoformat()})

        # ── CP Patterns ──────────────────────────────────────────────
        if path == "/api/cp/patterns" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({"seasonal": {"peak_hour": 20, "peak_day": "Saturday", "peak_month": "August"}, "emerging": [{"pattern_type": "Chain Snatching", "description": "Spike in evening incidents near commercial corridors", "severity": "high"}, {"pattern_type": "Vehicle Theft", "description": "Two-wheelers targeted in residential areas", "severity": "medium"}], "clusters": [{"area": "MG Road Corridor", "crime_count": 45, "dominant_crime_type": "Chain Snatching", "density": "high"}, {"area": "Koramangala Residential", "crime_count": 32, "dominant_crime_type": "Theft", "density": "medium"}], "last_updated": datetime.now(timezone.utc).isoformat()})

        # ── CP Finance ───────────────────────────────────────────────
        if path == "/api/cp/finance" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"alerts": [{"id": 1, "anomaly_type": "structuring", "station_name": "Koramangala PS", "amount": 450000, "entity_name": "SK Enterprises", "flagged_at": (now - timedelta(days=1)).isoformat()}, {"id": 2, "anomaly_type": "fan_in", "station_name": "MG Road PS", "amount": 1250000, "entity_name": "Multiple accounts → Singh Holdings", "flagged_at": (now - timedelta(days=2)).isoformat()}, {"id": 3, "anomaly_type": "velocity", "station_name": "Whitefield PS", "amount": 89000, "entity_name": "Rapid transactions in 1hr", "flagged_at": (now - timedelta(days=3)).isoformat()}], "summary": {"total_alerts": 3, "total_amount": 1789000, "high_priority": 1}, "last_updated": now.isoformat()})

        # ── CP Patrol ────────────────────────────────────────────────
        if path == "/api/cp/patrol" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"active_units": 124, "total_units": 150, "coverage_pct": 82.5, "incidents_today": 8, "recent_patrols": [{"unit_id": "PU-001", "area": "MG Road", "status": "active", "officers": 2, "start_time": (now - timedelta(hours=2)).isoformat()}, {"unit_id": "PU-002", "area": "Koramangala", "status": "active", "officers": 2, "start_time": (now - timedelta(hours=1)).isoformat()}, {"unit_id": "PU-003", "area": "Whitefield", "status": "returning", "officers": 3, "start_time": (now - timedelta(hours=4)).isoformat()}], "last_updated": now.isoformat()})

        # ── CP Officers ──────────────────────────────────────────────
        if path == "/api/cp/officers" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({"summary": {"total_officers": 28492, "on_duty": 18340, "on_leave": 2156, "training": 1892}, "by_rank": [{"rank": "Commissioner", "count": 1}, {"rank": "ADGP", "count": 4}, {"rank": "IGP", "count": 8}, {"rank": "DIG", "count": 16}, {"rank": "SP", "count": 31}, {"rank": "DCP", "count": 45}, {"rank": "ACP", "count": 120}, {"rank": "Inspector", "count": 450}, {"rank": "SI", "count": 1200}, {"rank": "ASI", "count": 2400}, {"rank": "HC", "count": 8500}, {"rank": "PC", "count": 15731}], "recent_transfers": [{"officer": "SI Meena", "from": "Koramangala PS", "to": "Kalaburagi City PS", "date": "2026-07-25"}, {"officer": "Inspector Rajesh", "from": "Vijayanagar PS", "to": "Mysuru North PS", "date": "2026-07-20"}], "last_updated": datetime.now(timezone.utc).isoformat()})

        # ── CP Orders ────────────────────────────────────────────────
        if path == "/api/cp/orders" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            now = datetime.now(timezone.utc)
            return _json_response({"orders": [{"id": "ORD-2026-001", "title": "Strengthen Night Patrols in Bengaluru Urban", "description": "Increase night patrol frequency across all stations to counter rising chain snatching incidents", "issued_to": "All DCPs, Bengaluru Urban", "priority": "critical", "status": "active", "date": (now - timedelta(days=1)).strftime("%Y-%m-%d"), "due_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"), "category": "Operations"}, {"id": "ORD-2026-003", "title": "Quarterly Firearms Inspection", "description": "All stations to complete quarterly firearms inspection and submit reports", "issued_to": "All District SPs", "priority": "high", "status": "active", "date": (now - timedelta(days=3)).strftime("%Y-%m-%d"), "due_date": (now + timedelta(days=14)).strftime("%Y-%m-%d"), "category": "Administration"}, {"id": "ORD-2026-008", "title": "Women Safety Audit", "description": "Conduct safety audit of all police stations for women-friendly infrastructure", "issued_to": "All District SPs, W&J Wing", "priority": "medium", "status": "completed", "date": (now - timedelta(days=60)).strftime("%Y-%m-%d"), "due_date": (now - timedelta(days=15)).strftime("%Y-%m-%d"), "category": "Administration"}], "summary": {"total": 3, "active": 2, "completed": 1}, "last_updated": now.isoformat()})

        # ── CP Coordination ──────────────────────────────────────────
        if path == "/api/cp/coordination" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({"active_coordination": [{"id": 1, "type": "joint_operation", "districts": ["Bengaluru Urban", "Bengaluru Rural"], "purpose": "Vehicle theft ring investigation", "status": "active", "start_date": "2026-07-20"}, {"id": 2, "type": "border_patrol", "districts": ["Belagavi", "Maharashtra"], "purpose": "Cross-border smuggling prevention", "status": "active", "start_date": "2026-07-15"}], "pending_requests": [{"from": "Kalaburagi SP", "to": "Bidar SP", "purpose": "Mining mafia coordination", "requested_date": "2026-07-25"}], "last_updated": datetime.now(timezone.utc).isoformat()})

        # ── CP Settings ──────────────────────────────────────────────
        if path == "/api/cp/settings" and method == "GET":
            user = _get_auth_user_or_demo(request)
            if not user: return _error_response("Authentication required", 401)
            return _json_response({"notifications": {"email": True, "sms": True, "push": True}, "auto_refresh_interval": 60, "default_view": "dashboard", "alerts_enabled": True, "last_updated": datetime.now(timezone.utc).isoformat()})

        # ═══════════════════════════════════════════════════════════════════
        #  END CP ENDPOINTS
        # ═══════════════════════════════════════════════════════════════════

        # Fallback — return 404
        return _error_response(f"Not Found: {method} {path}", 404)
    
    except Exception as e:
        logger.error("Unhandled error: %s", e, exc_info=True)
        return _error_response(f"Internal Server Error: {str(e)}", 500)
