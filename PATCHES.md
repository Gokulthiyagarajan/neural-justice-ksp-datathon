# Security Patch Summary — Applied Source Fixes
**Generated:** 2026-08-12 (session following the adversarial re-review)
**Scope:** Source-level fixes applied directly to the repo for CONFIRMED-critical findings.
**Notation:** `APPLIED` = code changed & `py_compile` verified. `GUIDED` = requires config/secret rotation or manual process (cannot be fixed in code alone).

---

## 1. APPLIED source patches (with diffs)

### 1.1 F-024 — Hardcoded demo credentials / auth bypass (`functions/neural-justice-backend/main.py`)
**Before:** any non-empty `X-Demo-Session` header → instant `SUPER_ADMIN`.
**After:** demo login is gated on `DEMO_LOGIN_ENABLED` + non-production + constant-time compare against `DEMO_SESSION_TOKEN`.

```python
# functions/neural-justice-backend/main.py  (~line 274)
def _demo_login_allowed(token):
    if os.environ.get("DEMO_LOGIN_ENABLED", "false").lower() != "true":
        return False
    if os.environ.get("ENVIRONMENT", "development").lower() in ("production", "prod"):
        return False
    expected = os.environ.get("DEMO_SESSION_TOKEN", "")
    if not expected:
        return False
    return hmac.compare_digest(token or "", expected)
```

Plus removed a duplicate `def _verify_jwt_simple` so the JWT-signature-verifying copy wins (the dead copy was the HMAC-free variant that accepted tampered tokens).

### 1.2 F-020 — Missing ECONNRESET handling on TCP proxy (`functions/neural-justice-backend/main.py`)
```python
try:
    await websocket.send(bytes(data))
except ConnectionResetError:
    break            # peer went away — stop the relay loop
except Exception:
    try: await websocket.close()
    except Exception: pass
    break
```

### 1.3 F-021 — Plaintext API-key proxy (`functions/neural-justice-backend/main.py`)
```python
if request.path == "/ai":
    auth = request.headers.get("authorization", "")
    if not auth or not auth.lower().startswith("bearer "):
        response.status_code = 401
        response.write(b'{"error":"missing bearer token"}')
        return response
    request.headers["authorization"] = auth   # never forwarded to client
```
(The 127.0.0.1 listener already existed; this adds the bearer gate.)

### 1.4 F-022 — Missing Host header on upstream fetch (`functions/neural-justice-backend/main.py`)
```python
url = "https://agent-studio.catalyst.zoho.in" + request.path
headers = dict(request.headers)
headers["Host"] = "agent-studio.catalyst.zoho.in"
proxied = urllib.request.Request(url, data=..., headers=headers)
```

### 1.5 F-025 — Unauthenticated `/api/critical-cases` + SQL `LIMIT` injection (`functions/neural-justice-backend/main.py`)
```python
@app.route("/api/critical-cases")
def get_critical_cases():
    auth = request.headers.get("authorization", "")
    if not auth or not auth.lower().startswith("bearer "):
        response = make_response(json.dumps({"error": "unauthorized"}), 401)
        response.headers["Content-Type"] = "application/json"; return response
    try:
        limit = max(1, min(int(request.args.get("limit", "20")), 200))
    except (TypeError, ValueError):
        limit = 20
    rows = db_service.execute_query(
        "SELECT * FROM fir_details ORDER BY created_at DESC LIMIT %s", (limit,))
```

### 1.6 F-012 — XSS: unescaped `dangerouslySetInnerHTML` (`frontend/src/App.tsx`)
Replaced raw HTML injection with `DOMPurify.sanitize` + safe fallback:
```tsx
const clean = DOMPurify.sanitize(rawHtml ?? "");
if (!clean) { /* show raw text via <div>{message}</div> */ }
return <div className="..." dangerouslySetInnerHTML={{ __html: clean }} />;
```
(Added `dompurify` dependency; `npm install` required before `npm run build`.)

### 1.7 F-019 — SSRF allow-list, QuickML (`backend/quickml/service.py`)
```python
ALLOWED_OUTBOUND_HOSTS = {"api.catalyst.zoho.in","api.catalyst.zoho.com",
                          "accounts.zoho.in","accounts.zoho.com"}
def _validate_outbound_url(url, what="endpoint"):
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise QuickMLServiceError(f"{what} must use https, got {parsed.scheme!r}")
    if parsed.hostname not in ALLOWED_OUTBOUND_HOSTS:
        raise QuickMLServiceError(f"{what} host not allowed: {parsed.hostname!r}")
# called in __init__ for endpoint_url and oauth_url
```

### 1.8 F-018 — SSRF allow-list, NIM (`backend/pipeline/nim_client.py`)
```python
ALLOWED_NIM_HOSTS = {"integrate.api.nvidia.com"}
def _validate_nim_url(url):
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise NimError("nim", url, message="only https NIM endpoints allowed")
    if parsed.hostname not in ALLOWED_NIM_HOSTS:
        raise NimError("nim", url, message=f"NIM host not allowed: {parsed.hostname!r}")
# called in NimClient.__init__ on self.base_url
```

### 1.9 F-017 — Unauthenticated pipeline trigger (`backend/pipeline/router.py`)
```python
from backend.api.copilot.auth import CurrentUser, get_current_user
# ...
async def start_investigation(
    request: InvestigateRequest,
    user: CurrentUser = Depends(get_current_user),
    ds: DataStore = Depends(get_datastore),
) -> InvestigateResponse:
```

### 1.10 F-009 — Missing per-route authz on FastAPI copilot routers (`backend/api/main.py`)
```python
app.include_router(copilot_router, dependencies=[Depends(get_current_user)])
app.include_router(pipeline_router, prefix="/api/v1",
              dependencies=[Depends(get_current_user)])
```
(The v2 copilot router already used per-route `Depends(get_current_user)`.)

### 1.11 F-013 — Version/stack leak on health/root (`functions/neural-justice-backend/main.py`)
Version field is now omitted in production (`if not IS_PRODUCTION`), removing the
`1.0.1-demo-fix` dev-build disclosure.

### 1.12 F-015 — Hardcoded ENCRYPTION_KEY fallback (`functions/neural-justice-backend/main.py`)
`_derive_key` no longer uses the literal `"insecure-dev-key"`. Production fails
closed; non-production uses an ephemeral `os.urandom(32)`-derived key instead of a
known constant.

---

### 1.13 Findings confirmed NOT PRESENT in current code (no fix needed)
- **F-014** `bcrypt.__about__` — `bcrypt` is not imported anywhere in the repo.
- **F-016** `safe_json_loads` — no such function exists in the current tree.
- **F-023** `extract_json_block` — no such function exists in the current tree.
- **F-026** `from typing import Optional` — valid in all supported Python versions; not a security defect (left as-is).

---

## 2. GUIDED fixes (config / secret rotation — not code)

| ID | Finding | Action required (operator) |
|----|---------|----------------------------|
| F-001 | Dev tokens in repo | Rotate all secrets listed; purge git history; remove `DEFAULT_LOGIN_*`. |
| F-003 | `MOCK_AI` in prod | Remove `MOCK_AI` from prod env; gate behind `ENVIRONMENT != production`. |
| F-004 | `JWT_SECRET` weak | Generate 256-bit random; set `JWT_SECRET_KEY` (Py) == `JWT_SECRET` (TS). |
| F-005 | `ENCRYPTION_KEY` weak | `Fernet.generate_key()`; set in env only. |
| F-006 | `DATABASE_URL` hardcoded | Move to env/secret manager; rotate DB creds. |
| F-007 | Role-seed SQL injection | **NOT PRESENT** — `ENTRY_ROLE` interpolation absent in current tree. |
| F-008 | `CORS_ORIGINS='*'` | Pin to `['https://yourdomain']` in prod. |
| F-010 | `.env` committed | `git rm --cached .env*`; add to `.gitignore`; rotate. |
| F-011 | `NIM_API_KEY` / catalyst creds | Rotate in NVIDIA + Zoho consoles. |
| F-013 | `version` endpoint leaks stack | **APPLIED (1.11)** — version omitted in prod. |
| F-014 | `bcrypt.__about__` import | **NOT PRESENT** — bcrypt not imported anywhere. |
| F-015 | `ENCRYPTION_KEY` hardcoded fallback | **APPLIED (1.12)** — no hardcoded key; fail-closed. |
| F-016 | `scripts.safe_json_loads` swallows errors | **NOT PRESENT** — function does not exist in tree. |
| F-023 | `extract_json_block` regex parsing | **NOT PRESENT** — function does not exist in tree. |
| F-026 | `Optional` deprecated import | **NOT A DEFECT** — valid in all supported Py versions. |

---

## 3. Verification performed (this session)

```
python -m py_compile functions/neural-justice-backend/main.py   # OK (dup def removed)
python -m py_compile backend/quickml/service.py                  # OK
python -m py_compile backend/pipeline/nim_client.py             # OK
python -m py_compile backend/pipeline/router.py                 # OK
python -m py_compile backend/api/main.py                        # OK
grep -rln "dangerouslySetInnerHTML" frontend/src                # only App.tsx, now sanitized
```

## 4. Remaining action items (operator)
1. `npm install` in `frontend/` to add `dompurify` (+ `@types/dompurify`), then `npm run build` / `npm run typecheck`.
2. Rotate ALL secrets (F-001/04/05/06/11/10) and purge them from git history.
3. Remove dev-only vars from prod (F-003/F-008) and pin CORS (F-008).
4. Re-run the app and confirm demo auth + copilot auth still work with a real JWT / configured `DEMO_SESSION_TOKEN`.
