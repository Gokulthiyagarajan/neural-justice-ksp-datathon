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
    """Call QuickML — tries SDK first, falls back to REST API."""
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
    
    conn = get_db()
    try:
        cur = conn.execute("SELECT * FROM user_auth WHERE username = ?", (username,))
        row = cur.fetchone()
        if not row:
            return _error_response("Invalid credentials", 401)
        if not _check_password(password, row["password_hash"]):
            return _error_response("Invalid credentials", 401)

        totp_secret = _generate_totp_secret()
        totp_uri = _get_totp_uri(totp_secret, row["email"])
        mfa_token = f"mfa-{uuid.uuid4().hex[:24]}"

        _mfa_sessions[mfa_token] = {
            "username": row["username"],
            "user_id": row["username"],
            "totp_secret": totp_secret,
            "totp_enrolled": bool(row["totp_enrolled"]),
        }

        roles = json.loads(row["roles"]) if isinstance(row["roles"], str) else row["roles"]

        return _json_response({
            "mfa_required": True,
            "mfa_token": mfa_token,
            "totp_setup": not row["totp_enrolled"],
            "totp_secret": totp_secret if not row["totp_enrolled"] else None,
            "totp_uri": totp_uri if not row["totp_enrolled"] else None,
            "user": {
                "id": row["username"],
                "username": row["username"],
                "email": row["email"],
                "name": row["name"],
                "roles": roles,
                "district_id": row["district_id"],
                "station_id": row["station_id"],
                "jurisdiction_type": "state",
                "scope_label": "Karnataka State - All Districts",
            }
        })
    finally:
        conn.close()


def _handle_verify_mfa(body: dict):
    if not body:
        return _error_response("Request body is required", 400)
    
    mfa_token = body.get("mfa_token", "")
    totp_code = body.get("totp_code", "")
    
    if not mfa_token or not totp_code:
        return _error_response("mfa_token and totp_code are required", 400)
    
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

    if not _verify_totp(totp_secret, totp_code, window=1):
        return _error_response("Invalid TOTP code", 401)

    # Persist TOTP enrollment on first successful verify
    conn = get_db()
    try:
        cur = conn.execute("SELECT totp_enrolled FROM user_auth WHERE username = ?", (username,))
        row = cur.fetchone()
        if row and not row["totp_enrolled"]:
            encrypted = _encrypt_totp_secret(totp_secret)
            conn.execute("UPDATE user_auth SET totp_secret = ?, totp_enrolled = 1 WHERE username = ?",
                        (encrypted, username))
            conn.commit()
    except Exception as e:
        logger.error("Failed to persist TOTP enrollment: %s", e)
    finally:
        conn.close()

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
            "name": "System Administrator",
            "roles": DEFAULT_ROLES,
            "district_id": DEFAULT_DISTRICT_ID,
            "station_id": DEFAULT_STATION_ID,
            "jurisdiction_type": "state",
            "scope_label": "Karnataka State - All Districts",
        }
    })


# ═══════════════════════════════════════════════════════════════════════
#  AI / QuickML HANDLERS
# ═══════════════════════════════════════════════════════════════════════

def _handle_ai_copilot(body: dict, request=None):
    """POST /api/ai/copilot — single-turn copilot query."""
    # Verify JWT
    user = _get_auth_user(request)
    if not user:
        return _error_response("Authentication required", 401)

    message = (body or {}).get("message", "")
    mode = (body or {}).get("mode", "general")

    if not message:
        return _error_response("message is required", 400)

    messages = [
        {"role": "system", "content": f"You are Neural Justice AI, a police intelligence copilot for Karnataka State Police. Mode: {mode}. Provide concise, actionable insights."},
        {"role": "user", "content": message},
    ]

    response_text = _call_quickml(messages)
    if response_text is None:
        return _json_response({
            "response": "AI service is currently unavailable. Please try again later.",
            "mode": mode,
            "confidence": 0.0,
            "requires_review": True,
        }, 503)

    return _json_response({
        "response": response_text,
        "mode": mode,
        "confidence": 0.85,
        "requires_review": False,
        "sources": [],
    })


def _handle_ai_copilot_chat(body: dict, request=None):
    """POST /api/ai/copilot/chat — multi-turn chat (used by CopilotPanel)."""
    user = _get_auth_user(request)
    if not user:
        return _error_response("Authentication required", 401)

    messages = (body or {}).get("messages", [])
    lang = (body or {}).get("language", "en")

    if not messages:
        return _error_response("messages are required", 400)

    # Prepend system message
    system_msg = {"role": "system", "content": f"You are Neural Justice AI, a police intelligence copilot for Karnataka State Police. Respond in {'Kannada (ಕನ್ನಡ)' if lang == 'kn' else 'English'}. Provide concise, actionable insights."}
    full_messages = [system_msg] + messages

    response_text = _call_quickml(full_messages)
    if response_text is None:
        return _json_response({
            "response": "AI service is currently unavailable. Please try again later.",
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
        
        # Fallback — return 404
        return _error_response(f"Not Found: {method} {path}", 404)
    
    except Exception as e:
        logger.error("Unhandled error: %s", e, exc_info=True)
        return _error_response(f"Internal Server Error: {str(e)}", 500)
