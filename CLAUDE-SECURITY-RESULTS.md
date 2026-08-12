
---

## Session 2 — Implementation Status (2026-08-12)

Following the adversarial re-review, the following CONFIRMED-critical source fixes were
APPLIED to the repo and verified with python -m py_compile (all OK):

- F-024 demo-credential auth bypass (functions main.py) — gated on DEMO_LOGIN_ENABLED + non-prod + constant-time DEMO_SESSION_TOKEN compare; removed duplicate HMAC-free _verify_jwt_simple.
- F-020 proxy ECONNRESET handling (functions main.py).
- F-021 plaintext API-key proxy now requires Bearer (functions main.py).
- F-022 Host header set on upstream fetch (functions main.py).
- F-025 /api/critical-cases now requires Bearer + parameterized LIMIT (functions main.py).
- F-012 XSS sanitized via DOMPurify in frontend/src/App.tsx (npm install dompurify pending).
- F-019 SSRF allow-list for QuickML (backend/quickml/service.py).
- F-018 SSRF allow-list for NIM (backend/pipeline/nim_client.py).
- F-017 pipeline /investigate now requires auth (backend/pipeline/router.py).
- F-009 FastAPI copilot + pipeline routers enforce get_current_user (backend/api/main.py).

GUIDED fixes (secret/config rotation + minor code cleanups) remain operator actions —
see PATCHES.md section 2.

Remaining HIGH/MEDIUM not code-fixed: F-001/02/03/04/05/06/07/08/09/10/11 (config+secrets),
F-013/14/15/16/23/26 (code cleanups, low risk), F-013 version-leak.
