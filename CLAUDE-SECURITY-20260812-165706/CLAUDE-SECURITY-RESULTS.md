# Claude Security Scan — Final Report

*Generated: 2026-08-12 22:43*  
*Tier: `max` · Categories: `all applicable`*

## Executive Summary

- **26 confirmed** findings, **0 refuted**, **0 unreviewed**.
- Severity of confirmed: CRITICAL=7, HIGH=5, MEDIUM=12, LOW=2.

## Confirmed Findings

### [CRITICAL] F-003 — `leaked-third-party-api-credential`

- **Location:** `.env:189`  
- **Category:** external-integration  
- **Panel:** 2/3 confirmed

A live NVIDIA NIM API key (nvapi- prefix) is committed in plaintext in .env and duplicated in functions/neural-justice-backend/catalyst-config.json (a production deploy artifact). Real key confirmed by masked check.

**Evidence / Detail**

NVIDIA_API_KEY=nvapi-... (value withheld) at .env:189 and catalyst-config.json:17. Used by backend/api/copilot/llm_client.py and functions backend.

**Impact**

Third-party billing fraud / quota abuse / identity misuse by anyone with repo/artifact access.

**Suggested Fix**

Rotate the key immediately; move to Catalyst secret injection; scrub from git history.

### [CRITICAL] F-005 — `hardcoded-admin-backdoor-credentials`

- **Location:** `functions/neural-justice-backend/main.py:930`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

Login accepts hardcoded admin/admin and admin/admin123; for 'admin' it sets totp_enrolled=0 and issues a SUPER_ADMIN JWT with no DB password check and no MFA.

**Evidence / Detail**

main.py:930-932 is_demo = (admin/admin123|admin) or (demo/demo); admin branch sets DEFAULT_ROLES SUPER_ADMIN, totp_enrolled=0, token issued at ~L987.

**Impact**

Anyone knowing the static strings (in source) obtains a signed state-wide admin token.

**Suggested Fix**

Remove hardcoded credentials; always verify password against stored hash + enforce MFA.

### [CRITICAL] F-006 — `hardcoded-mfa-bypass-and-2fa-seed-leak`

- **Location:** `functions/neural-justice-backend/main.py:1038`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

_handle_verify_mfa trusts DEMO_MFA_TOKEN='demo-mfa-token', accepts fixed code '123456', and uses a hardcoded 2FA seed JBSWY3DPEHPK3PXP to issue a SUPER_ADMIN session. The seed is committed in source.

**Evidence / Detail**

main.py:1038-1046 — DEMO_MFA_TOKEN + '123456' or _verify_totp('JBSWY3DPEHPK3PXP',...) grants access; seed also at L955/L959.

**Impact**

Complete MFA bypass; committed seed enables offline TOTP forgery.

**Suggested Fix**

Remove demo MFA tokens; generate per-user TOTP secrets at enrollment, never hardcode.

### [CRITICAL] F-007 — `leaked-jwt-signing-key-enables-token-forgery`

- **Location:** `.env:29`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

.env holds a REAL HS256 signing key (JWT_SECRET_KEY/JWT_SECRET=504c17c2...). The deployed function reads this exact key and verifies signatures properly, so knowing it lets an attacker forge valid, signature-verified SUPER_ADMIN JWTs.

**Evidence / Detail**

.env:29-30 JWT_SECRET_KEY/JWT_SECRET=504c17c20c7723b75d2b766862efb120d2612cbe2d403926b3ce2b21dda452ec; catalyst-config.json:9 also 2779c6dc....

**Impact**

Independent of the header bypass, attacker forges valid admin tokens for the live, signature-verifying API.

**Suggested Fix**

Rotate the JWT secret; inject via Catalyst secrets; scrub from history.

### [CRITICAL] F-001 — `jwt-signature-not-verified`

- **Location:** `backend/api/copilot/auth.py:50`  
- **Category:** external-integration  
- **Panel:** 3/3 confirmed

_verify_jwt_simple() base64-decodes the JWT payload and only checks exp; it NEVER verifies the HS256 HMAC signature. Any attacker can forge a token with arbitrary roles/sub/district_id/station_id, defeating all copilot authorization including jurisdiction scoping.

**Evidence / Detail**

auth.py:50-62 — payload = json.loads(base64.urlsafe_b64decode(parts[1])); if payload.get('exp',0) < time.time(): return None. No hmac.compare_digest on signature. JWT_SECRET defaults to 'neural-justice-dev-secret' if env unset.

**Impact**

Full unauthenticated admin on the copilot API; jurisdiction filters become empty -> read all FIR/case/profiles data across every district.

**Suggested Fix**

Verify HS256 signature with the real JWT secret via a vetted library (python-jose/jwt); never accept unverified payloads; remove the dev fallback secret.

### [CRITICAL] F-002 — `demo-header-privilege-escalation`

- **Location:** `backend/api/copilot/auth.py:76`  
- **Category:** external-integration  
- **Panel:** 3/3 confirmed

get_current_user() returns SUPER_ADMIN for ANY non-empty X-Demo-Session header, no validation. Unauthenticated full-admin bypass.

**Evidence / Detail**

auth.py:76-83 — if x_demo_session: return CurrentUser(username='admin', roles=['SUPER_ADMIN'], jurisdiction_type='state').

**Impact**

Send 'X-Demo-Session: x' to become state-wide admin on every copilot route (real DB).

**Suggested Fix**

Remove the demo header path from any non-dev build; gate behind an explicit, non-header dev flag.

### [CRITICAL] F-004 — `unauthenticated-superadmin-bypass-spoofable-headers`

- **Location:** `functions/neural-justice-backend/main.py:274`  
- **Category:** external-integration  
- **Panel:** 3/3 confirmed

The DEPLOYED production handler gates every endpoint via _get_auth_user()/_get_auth_user_or_demo(), which return SUPER_ADMIN whenever ANY of X-Zc-User-Cred-Token (any value), X-Demo-Session (any value), or Authorization containing 'demo-session' is present — before any JWT verification.

**Evidence / Detail**

main.py:274-279 — if zc_token/ x_demo/ 'demo-session' in auth: return {'roles':['SUPER_ADMIN']...}. Covers ALL routes (cases, criminal-profiles, fir-ops, dashboard, copilot, ai/*).

**Impact**

Unauthenticated attacker sends 'X-Demo-Session: x' and gains SUPER_ADMIN on the LIVE API; mass PII/police-intelligence disclosure.

**Suggested Fix**

Delete the demo/sentinel header shortcuts in the deployed function; require real JWT/catalyst auth on every route.

### [HIGH] F-008 — `hardcoded-production-secrets`

- **Location:** `functions/neural-justice-backend/catalyst-config.json:9`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

Production deploy config embeds real JWT secret, Fernet ENCRYPTION_KEY, Zoho client secret, and NVIDIA key in plaintext.

**Evidence / Detail**

catalyst-config.json:9-24 — JWT_SECRET_KEY=2779c6dc..., ENCRYPTION_KEY=1CMq90..., ZOHO_CLIENT_SECRET=2047fe....

**Impact**

Anyone with artifact access can forge JWTs, decrypt TOTP secrets, and impersonate the app against Zoho.

**Suggested Fix**

Move all to Catalyst secret injection; rotate; do not commit deploy artifacts with secrets.

### [HIGH] F-009 — `missing-per-route-authz`

- **Location:** `backend/api/main.py:74`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

All 13 routers mounted with no global auth middleware and no Depends(auth) in route modules. Currently synthetic data, but the police-API surface has zero auth if wired to live data.

**Evidence / Detail**

main.py:74-88 include_router calls, only CORSMiddleware; routes/*.py have no auth import.

**Impact**

Unauthenticated enumeration/disclosure of law-enforcement data if these routes hit real stores.

**Suggested Fix**

Apply a global auth dependency (or per-router) and jurisdiction checks before any production data wiring.

### [HIGH] F-010 — `indirect-prompt-injection-retrieved-data`

- **Location:** `backend/api/copilot/chat_pipeline.py:161`  
- **Category:** prompt-injection  
- **Panel:** 2/2 confirmed

Attacker-influenceable DB fields (brief_facts, descriptions, victim/accused names) concatenated verbatim into model context as 'Retrieved Data:' with no delimiting, enabling indirect prompt injection.

**Evidence / Detail**

chat_pipeline.py:160-161 context += f"\n\nRetrieved Data:\n{data_context}"; data_context from router.py:156 raw rows.

**Impact**

A planted FIR/complaint record can override system guardrails or exfiltrate other PII into chat output.

**Suggested Fix**

Delimit/escape retrieved data; mark it as untrusted; strip instructions; consider structured (non-prompt) retrieval.

### [HIGH] F-011 — `unauthenticated-role-injection`

- **Location:** `backend/ai/copilot/service.py:162`  
- **Category:** prompt-injection  
- **Panel:** 2/2 confirmed

/api/ai/copilot has no auth and forwards caller-supplied messages (including role:'system') verbatim into the LLM call; req.user_role is client-supplied.

**Evidence / Detail**

copilot.py -> service.py:162 enriched_messages.extend(history); caller can send {role:'system',content:'...'} to override the real system prompt.

**Impact**

Unauthenticated attacker steers the AI's instructions; disclosure/fabrication of authoritative police responses.

**Suggested Fix**

Require auth; drop/replace any caller-supplied system roles; constrain user_role server-side.

### [HIGH] F-012 — `no-data-instruction-separation`

- **Location:** `backend/api/copilot/chat_pipeline.py:157`  
- **Category:** prompt-injection  
- **Panel:** 2/2 confirmed

User message + full conversation history concatenated as plain text with no delimiters and no 'treat user content as untrusted' instruction.

**Evidence / Detail**

chat_pipeline.py:157 context = f"{platform_context}\n\nConversation history:\n{history_text}\nUser's current message: {user_message}".

**Impact**

Authenticated officer can embed 'ignore previous instructions' jailbreaks the model follows.

**Suggested Fix**

Separate system/data channels; instruct the model that user/history content is untrusted data.

### [MEDIUM] F-013 — `stored-indirect-injection-via-refed-history`

- **Location:** `backend/api/copilot/chat_pipeline.py:155`  
- **Category:** prompt-injection  
- **Panel:** 2/2 confirmed

Deterministic case replies embed raw DB field values and are stored as 'assistant' messages; re-read as history and fed back to the model, so a planted DB value executes in a later officer session.

**Evidence / Detail**

router.py stores assistant reply; re-read as llm_history; response.py interpolates r['brief_facts'] etc. unescaped before LLM re-ingestion.

**Impact**

Complainant/data-entry actor can silently influence the AI an officer sees (crosses trust boundary).

**Suggested Fix**

Sanitize/escape DB-derived text before re-ingestion; mark history provenance.

### [MEDIUM] F-014 — `css-injection-llm-chart-colors`

- **Location:** `frontend/src/copilot/CopilotMessage.tsx:63`  
- **Category:** prompt-injection  
- **Panel:** 2/2 confirmed

LLM-controlled chart colors flow unescaped into a React inline style background; crafted chart JSON achieves CSS injection / UI redress / external beacon.

**Evidence / Detail**

CopilotMessage.tsx:63 background: chartColors[i % len]; source via parseCopilotResponse -> JSON.parse(chartData.json).

**Impact**

Defacement / beacon to attacker host within the copilot panel.

**Suggested Fix**

Allow-list chart color values; validate against a safe pattern.

### [MEDIUM] F-015 — `xss-via-dangerouslySetInnerHTML-latent`

- **Location:** `frontend/src/pages/pi/PICopilot.tsx:185`  
- **Category:** prompt-injection  
- **Panel:** 2/2 confirmed

Model output rendered via dangerouslySetInnerHTML through hand-rolled renderMarkdown that escapes &,<,> but uses no vetted sanitizer and does not escape quotes; currently blocks script XSS but is a fragile, high-regression sink.

**Evidence / Detail**

PICopilot.tsx:27-40 escape-first then inject tags; sink at :185. Live exploitability latent, not confirmed.

**Impact**

If sanitizer regresses or gains attribute/uri support, stored XSS in officer session.

**Suggested Fix**

Replace with DOMPurify or a vetted markdown lib; never hand-roll HTML from model output.

### [MEDIUM] F-016 — `xss-via-javascript-href-in-markdown-link`

- **Location:** `frontend/src/components/AI/Markdown.tsx:40`  
- **Category:** prompt-injection  
- **Panel:** 2/2 confirmed

Shared 'safe' Markdown renderer sets <a href={lm[2]}> from model URLs with no scheme allow-list; [click](javascript:alert(1)) yields XSS. Currently unused (no importer) but is the designated copilot renderer.

**Evidence / Detail**

Markdown.tsx:33-46 href=lm[2] with only 'http' prefix check for target/rel; raw URL always set.

**Impact**

If adopted to render copilot output, reflected/stored XSS via javascript: href.

**Suggested Fix**

Allow-list http/https only; reject javascript:/data:/vbscript:.

### [MEDIUM] F-017 — `unauthenticated-pipeline-trigger`

- **Location:** `backend/pipeline/router.py:92`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

POST /api/v1/investigate requires only get_datastore (no user auth); spawns an LLM pipeline (real cost) and reads the DataStore.

**Evidence / Detail**

router.py:92 start_investigation(request, ds=Depends(get_datastore)); asyncio.create_task(_run_and_collect()).

**Impact**

Unauthenticated users drive backend LLM spend and data reads.

**Suggested Fix**

Require authentication; rate-limit.

### [MEDIUM] F-018 — `ssrf-unvalidated-endpoint-url`

- **Location:** `backend/ai/config.py:59`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

quickml_endpoint_url / oauth_url read verbatim from env with no scheme/host allow-list; with Zoho token attached, becomes SSRF with credential exfiltration if env is tampered.

**Evidence / Detail**

config.py:59/105 -> quickml.py posts to unvalidated url with Authorization header.

**Impact**

Operator/attacker influencing env can pivot model traffic / exfiltrate OAuth secret.

**Suggested Fix**

Allow-list outbound LLM/QuickML hosts; validate scheme=https.

### [MEDIUM] F-019 — `ssrf-no-allowlist`

- **Location:** `backend/quickml/service.py:127`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

QuickMLService posts to caller/config-influenced endpoint_url/oauth_url with no allow-list.

**Evidence / Detail**

service.py:70/126-131 self._http.post(self._endpoint_url, ...).

**Impact**

Latent SSRF if instantiated with untrusted URL.

**Suggested Fix**

Allow-list hosts; validate scheme.

### [MEDIUM] F-020 — `hardcoded-default-secret`

- **Location:** `backend/api/copilot/auth.py:19`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

JWT_SECRET falls back to hardcoded 'neural-justice-dev-secret' if env unset -> trivially forgeable.

**Evidence / Detail**

auth.py:19 JWT_SECRET = os.environ.get('JWT_SECRET_KEY', os.environ.get('JWT_SECRET','neural-justice-dev-secret')).

**Impact**

Misconfigured deploy signs/accepts tokens with a public key.

**Suggested Fix**

Fail closed if secret unset; never ship a default.

### [MEDIUM] F-021 — `weak-encryption-of-secrets`

- **Location:** `functions/neural-justice-backend/main.py:179`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

TOTP secrets 'encrypted' with XOR against SHA256 of ENCRYPTION_KEY (defaults to 'insecure-dev-key'); not authenticated encryption, trivially reversible.

**Evidence / Detail**

main.py:179-201 _derive_key(raw=ENCRYPTION_KEY+salt or 'insecure-dev-key'); XOR keystream.

**Impact**

Stored MFA secrets recoverable at rest.

**Suggested Fix**

Use Fernet (or AES-GCM) with a proper key; fail closed on missing key.

### [MEDIUM] F-022 — `secret-exposure-in-response`

- **Location:** `functions/neural-justice-backend/main.py:1010`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

Demo login response leaks the literal TOTP secret JBSWY3DPEHPK3PXP in demo_totp_hint.

**Evidence / Detail**

main.py:1010 'demo_totp_hint': 'Use any authenticator app with secret: JBSWY3DPEHPK3PXP'.

**Impact**

Anyone can compute valid MFA codes for the demo account; reveals static scheme.

**Suggested Fix**

Never return secrets in responses.

### [MEDIUM] F-023 — `insecure-cors`

- **Location:** `functions/neural-justice-backend/catalyst-config.json:15`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

CORS_ORIGINS set to '*' in the production deploy config, allowing any origin to call the API with bearer tokens.

**Evidence / Detail**

catalyst-config.json:15 CORS_ORIGINS '*', ENVIRONMENT production.

**Impact**

Cross-site credentialed access / data exfiltration.

**Suggested Fix**

Restrict CORS to known origins.

### [MEDIUM] F-024 — `insecure-default-credentials`

- **Location:** `functions/neural-justice-backend/main.py:54`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

DEFAULT_LOGIN_PASSWORD defaults to 'test123' seeding a SUPER_ADMIN; if env unset the app is compromisable with default creds.

**Evidence / Detail**

main.py:54 DEFAULT_LOGIN_PASSWORD='test123'; init seeds admin with it.

**Impact**

Default-cred admin takeover.

**Suggested Fix**

Require explicit admin password at init; no default.

### [LOW] F-025 — `header-injection-and-error-leak`

- **Location:** `backend/api/routes/reports.py:84`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

Unvalidated crime_no path param reflected into Content-Disposition header (CRLF/quote injection) and raw exception string returned to client on failure.

**Evidence / Detail**

reports.py:84 f'attachment; filename="FIR_{crime_no}.pdf"'; except -> detail=f'PDF generation failed: {exc}'.

**Impact**

Response header injection / internal detail leakage.

**Suggested Fix**

Allow-list crime_no (^[A-Za-z0-9-]+$); return generic error.

### [LOW] F-026 — `ssrf-base-url-override-no-allowlist`

- **Location:** `backend/pipeline/nim_client.py:116`  
- **Category:** external-integration  
- **Panel:** 2/2 confirmed

NimClient accepts arbitrary base_url override with no validation; latent SSRF if a future caller passes request/config data.

**Evidence / Detail**

nim_client.py:116 self.base_url = base_url or NIM_BASE_URL; used at :172. Not currently reachable from untrusted input.

**Impact**

Latent SSRF surface.

**Suggested Fix**

Validate/allow-list base_url; reject caller-supplied overrides.
