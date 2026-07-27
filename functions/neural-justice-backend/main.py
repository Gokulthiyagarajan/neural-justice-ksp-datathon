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
import sqlite3
import struct
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
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
DB_PATH = os.environ.get("DATABASE_URL", "sqlite:///./neural_justice.db")
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH[len("sqlite:///"):]

DEFAULT_PASSWORD = os.environ.get("DEFAULT_LOGIN_PASSWORD", "test123")
DEFAULT_ROLES = json.loads(os.environ.get("DEFAULT_LOGIN_ROLES", '["SUPER_ADMIN"]'))
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
#  ENCRYPTION (XOR with derived key)
# ═══════════════════════════════════════════════════════════════════════

def _derive_key(salt: str = "") -> bytes:
    raw = ENCRYPTION_KEY + salt or "insecure-dev-key"
    return hashlib.sha256(raw.encode()).digest()


def _encrypt_totp_secret(secret: str) -> str:
    if not secret:
        return secret
    key = _derive_key("totp")[:len(secret)]
    xored = bytes(a ^ b for a, b in zip(secret.encode(), key))
    return base64.urlsafe_b64encode(xored).decode()


def _decrypt_totp_secret(stored: str) -> str:
    if not stored:
        return stored
    try:
        raw = base64.urlsafe_b64decode(stored.encode())
        key = _derive_key("totp")[:len(raw)]
        return bytes(a ^ b for a, b in zip(raw, key)).decode()
    except Exception:
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
    """Extract and verify JWT from Authorization header. Returns payload or None."""
    try:
        auth = None
        if hasattr(request, 'headers'):
            hdrs = request.headers
            if callable(hdrs):
                hdrs = hdrs()
            if isinstance(hdrs, dict):
                auth = hdrs.get("Authorization", "")
        if not auth and hasattr(request, 'get_header'):
            auth = request.get_header("Authorization", "")
        if not auth:
            return None
        if auth.startswith("Bearer "):
            auth = auth[7:]
        return _verify_jwt(auth)
    except Exception:
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
    return _call_quickml_rest(messages, max_tokens, temperature)


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
        if hasattr(request, 'params'):
            params = request.params(name) if callable(request.params) else request.params
            if isinstance(params, dict):
                return params.get(name, default)
        if hasattr(request, 'query_string'):
            qs = request.query_string
            if isinstance(qs, str):
                vals = parse_qs(qs)
                return vals.get(name, [default])[0]
        return default
    except Exception:
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


def _handle_health():
    return _json_response({"status": "healthy", "version": "1.0.0", "service": "neural-justice-backend"})


def _handle_root():
    return _json_response({"status": "ok", "message": "Neural Justice API is running"})


def _handle_login(body: dict):
    if not body:
        return _error_response("Request body is required", 400)
    
    username = body.get("username", "")
    password = body.get("password", "")
    
    if not username or not password:
        return _error_response("username and password are required", 400)
    
    # Demo credentials for all roles - accept any username/password for demo
    is_demo = username == "demo" and password == "demo"
    
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
        # Demo user - use default values
        row = {
            "username": "demo",
            "email": "demo@neural-justice.gov.in",
            "name": "Demo Officer",
            "roles": json.dumps(DEFAULT_ROLES),
            "district_id": DEFAULT_DISTRICT_ID,
            "station_id": DEFAULT_STATION_ID,
            "totp_enrolled": 1,  # Force TOTP enrollment for demo
            "totp_secret": _encrypt_totp_secret("JBSWY3DPEHPK3PXP"),  # Pre-set secret for demo
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
        "totp_enrolled": True,
    }

    roles = json.loads(row["roles"]) if isinstance(row.get("roles"), str) else row.get("roles", DEFAULT_ROLES)

    return _json_response({
        "mfa_required": True,
        "mfa_token": mfa_token,
        "totp_setup": False,  # TOTP is mandatory, no setup needed
        "totp_secret": None,  # Don't expose secret
        "totp_uri": None,  # Don't expose URI
        "demo_totp_hint": "Use any authenticator app with secret: JBSWY3DPEHPK3PXP (generates codes for 'demo')" if is_demo else None,
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
    
    if mfa_token == DEMO_MFA_TOKEN:
        # For demo users, verify against the shared secret
        if not _verify_totp(DEMO_TOTP_SECRET, totp_code, window=1):
            return _error_response("Invalid TOTP code", 401)
        
        # On successful enrollment, store the secret for future verifications
        if is_enrollment:
            _mfa_sessions[DEMO_MFA_TOKEN] = {
                "username": DEMO_USERNAME,
                "user_id": DEMO_USERNAME,
                "totp_secret": DEMO_TOTP_SECRET,
                "totp_enrolled": True,
            }
        
        # Generate a proper JWT for the demo user so subsequent API calls work
        now = datetime.now(timezone.utc)
        payload = {
            "sub": DEMO_USERNAME,
            "email": "admin@neural-justice.gov.in",
            "iat": now,
            "exp": now + timedelta(minutes=JWT_EXPIRY_MINUTES),
            "roles": ["CP"],
            "district_id": 1,
            "station_id": 1,
            "jurisdiction_type": "state",
        }
        access_token = _create_jwt(payload)
        
        return _json_response({
            "access_token": access_token,
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

    totp_secret = session["totp_secret"]
    username = session["username"]

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

    # Get real data context
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

    # Get real data context
    data = _get_data_context()
    data_summary = f"""
KSP Database Context:
- {len(data['recent_cases'])} recent cases
- {len(data['top_stations'])} active stations
- Crime types: {', '.join([c['crime_type'] for c in data['crime_distribution'][:5]])}
"""

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
                return _json_response([dict(r) for r in rows])
            finally: conn.close()
        
        if path.startswith("/api/criminal-profiles/") and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            pid = path.split("/")[-1]
            conn = get_db()
            try:
                row = conn.execute("SELECT * FROM criminal_profiles WHERE id=?", (pid,)).fetchone()
                return _json_response(dict(row) if row else {})
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

        # ── CP Warnings ──────────────────────────────────────────
        if path == "/api/cp/warnings" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute(
                    "SELECT * FROM warnings WHERE severity IN ('critical','high') ORDER BY created_at DESC LIMIT 20"
                ).fetchall()
                warnings = [dict(r) for r in rows]
                if not warnings:
                    warnings = [
                        {"id": 1, "type": "Crime Spike", "severity": "critical", "district": "Bengaluru Urban",
                         "description": "Unusual spike in theft reports in Bengaluru Urban district this week",
                         "created_at": "2026-07-26 10:00:00", "status": "active"},
                        {"id": 2, "type": "Repeat Offender", "severity": "high", "district": "Kalaburagi",
                         "description": "Pattern detected: 3 related robbery incidents in Kalaburagi this month",
                         "created_at": "2026-07-25 14:30:00", "status": "active"},
                    ]
                return _json_response({"warnings": warnings, "total": len(warnings)})
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
                rows = conn.execute("SELECT * FROM stations WHERE status='active'").fetchall()
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
                "fir_trend": 12.5, "open_cases": 18, "solved_rate": 38.2, "high_risk_count": 4,
                "high_risk_accused": [
                    {"id": 1, "name": "Ravi Kumar", "fir_count": 5, "crime_type": "Robbery", "risk_score": 92},
                    {"id": 2, "name": "Suresh Patel", "fir_count": 3, "crime_type": "Assault", "risk_score": 88},
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
            if not user: return _error_response("Authentication required", 401)
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

        # ── FIR Operations (used by SPCases, FIRDetailPage, etc.) ────────────────────
        if path == "/api/fir-ops" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            dc = _get_query_param(request, "district_id", "BENGALURU_URBAN")
            limit = int(_get_query_param(request, "limit", "200"))
            conn = get_db()
            try:
                rows = conn.execute(
                    "SELECT id as case_master_id, crime_no, crime_type as crime_head_name, status as case_status_name, station, district, occurrence_date, filing_date, brief_facts, latitude as lat, longitude as lng FROM cases WHERE district=? ORDER BY created_at DESC LIMIT ?",
                    (dc, limit)
                ).fetchall()
                return _json_response({"firs": [dict(r) for r in rows]})
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
                        row = conn.execute("SELECT * FROM cases WHERE crime_no=?", (crime_no,)).fetchone()
                        return _json_response(dict(row) if row else {})
                    elif len(parts) == 5 and parts[4] == "timeline":  # /api/firs/{crime_no}/timeline
                        row = conn.execute("SELECT crime_no, status, occurrence_date, filing_date, station FROM cases WHERE crime_no=?", (crime_no,)).fetchone()
                        if row:
                            return _json_response({"crime_no": crime_no, "events": [
                                {"date": row["occurrence_date"] or "", "event": "FIR Registered", "station": row["station"], "crime_no": crime_no},
                                {"date": row["filing_date"] or "", "event": "Case Filed", "station": row["station"], "crime_no": crime_no},
                            ]})
                        return _json_response({"crime_no": crime_no, "events": []})
                    elif len(parts) == 5 and parts[4] == "accused":
                        return _json_response([])
                    elif len(parts) == 5 and parts[4] == "victims":
                        return _json_response([])
                    elif len(parts) == 5 and parts[4] == "case-dates":
                        return _json_response({"crime_no": crime_no, "dates": []})
                return _error_response("Not Found", 404)
            finally: conn.close()

        if path == "/api/firs/assigned" and method == "GET":
            user = _get_auth_user(request)
            if not user: return _error_response("Authentication required", 401)
            conn = get_db()
            try:
                rows = conn.execute("SELECT * FROM cases ORDER BY created_at DESC LIMIT 50").fetchall()
                return _json_response({"firs": [dict(r) for r in rows], "total": len(rows)})
            finally: conn.close()

        # Fallback — return 404
        return _error_response(f"Not Found: {method} {path}", 404)
    
    except Exception as e:
        logger.error("Unhandled error: %s", e, exc_info=True)
        return _error_response(f"Internal Server Error: {str(e)}", 500)
