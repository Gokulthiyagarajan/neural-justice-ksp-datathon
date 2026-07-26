# Neural Justice

**Enterprise AI Crime Intelligence Platform for Karnataka State Police (KSP)**

Neural Justice is a production-grade, AI-assisted crime intelligence and case-management platform built natively on Zoho Catalyst. It unifies FIR management, geospatial analytics, behavioral profiling, early-warning detection, patrol recommendation, and an investigative AI copilot into a single secure command environment for law-enforcement analysts and officers.

---

## Features

- **FIR Management** — Search, explore, and drill into First Information Reports with rich filtering and detail views
- **Dashboard & Analytics** — KPI cards, crime-trend charts (30/60/90/180-day moving averages), and incident mapping
- **Geospatial Intelligence** — MapLibre + Leaflet dual-engine maps with FIR, station, density-heatmap, and hotspot layers; timeline replay; route navigation
- **Crime Hotspots & Heatmaps** — Density analysis, hotspot detection, patrol recommendation, and hotspot detail/report workflows
- **Early Warning System** — Circuit-driven detectors (crime spikes, repeat criminals/victims, grouped patterns) with officer alerts, push notifications, and mail digests
- **Behavioral Profiling** — Accused risk profiles, preferred crime types, known associates, and risk-factor explainability
- **Risk Scoring (XAI)** — Calibrated risk scores with SHAP-style contribution breakdown and officer feedback loop
- **Crime Patterns** — Cluster detection, emerging-threat and MO-similarity analysis with actionable recommendations
- **Forecasting** — Probabilistic crime forecasting with confidence bands by district and crime type
- **Criminal Network Analysis** — Co-accused relationship graphs, repeat offender detection, and ring detection
- **AI Copilot** — Multi-mode investigative assistant (FIR search, case analysis, pattern query, NL2SQL, statistical)
- **Voice & Documents** — Zia OCR, speech-to-text, translation, and document upload for case enrichment

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Client (React SPA)                    │
│  Vite · TypeScript · Tailwind · MapLibre · Leaflet · Zustand│
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / API Gateway
┌──────────────────────▼──────────────────────────────────────┐
│              Catalyst API Gateway (25 routes)                │
│         CORS · Rate Limiting · RBAC · JWT Auth              │
├──────────────────────┬──────────────────────────────────────┤
│    Python API FastAPI │   Serverless Functions (Node/Python) │
│    Auth · FIRs · AI   │   Geo · OCR · Speech · Translation  │
│    Analytics · Risk   │   Voice · Reports · Search           │
│    Profiles · Warnings│   Notifications · Data Sync          │
├──────────┬───────────┴──────────┬───────────────────────────┤
│  Data Store (PostgreSQL)        │  NoSQL (Document Store)    │
│  fir_cases · accused · victims  │  Conversations · Memory   │
│  police_stations · districts    │  Embeddings · AIHistory   │
│  crime_heads · risk_scores      │                            │
│  early_warnings · forecasts     │                            │
├──────────┬──────────────────────┴───────────────────────────┤
│  Stratus (File Storage) │  Cache · QuickML · SmartBrowz     │
│  Circuits · Signals     │  Cron · Push · Mail · Pipelines   │
└─────────────────────────────────────────────────────────────┘
```

---

## Catalyst Service Matrix

Neural Justice is built **natively on Zoho Catalyst** — not just deployed to it. The table below maps every platform capability to the specific Catalyst service that powers it.

| Capability | Catalyst Service | Notes |
|------------|------------------|-------|
| Web Client (React SPA) | Catalyst Web Client Hosting | 3 environments (dev/staging/prod) |
| API Gateway & Routing | Catalyst API Gateway | 25 routes, per-route CORS, rate limit, RBAC |
| FastAPI Backend | Catalyst AppSail (Python 3.11) | Long-running backend runtime |
| Serverless Logic | Catalyst Functions (Node/Python) | Geo, OCR, Speech, Translation, Reports, Search, Notifications |
| FIR / Case Data | Catalyst Data Store (PostgreSQL) | `FIR_Records`, `Accused_Master`, `Victim_Records`, `Police_Stations`, `Districts`, `Crime_Heads` |
| Conversations & Memory | Catalyst NoSQL | Conversations, Memory, Embeddings, AIHistory |
| File & Evidence Storage | Catalyst Stratus | Reports, uploads, evidence, voice sessions |
| Query Layer | ZCQL (Zoho Catalyst Query Language) | FIR Operations + Reports read live from `FIR_Records` via ZCQL |
| Auth | Catalyst Auth + JWT hybrid | 13-role RBAC hierarchy |
| AI Copilot / Embeddings | Catalyst QuickML | LLM provider, embeddings, RAG pipeline |
| Document OCR | Catalyst Zia OCR | Kannada + English |
| Speech | Catalyst Zia Speech | STT / TTS |
| Translation | Catalyst Zia Translation | English ↔ Kannada |
| PDF Generation | Catalyst SmartBrowz | Reports, case summaries |
| Alerting | Catalyst Signals + Push + Mail | Early-warning detectors → officer alerts |
| Workflows | Catalyst Circuits | FIR ingestion, case resolution, evidence retention |
| Scheduling | Catalyst Cron | 13 scheduled jobs |
| CI/CD | Catalyst Pipelines | build → lint → test → deploy staging → deploy prod → rollback |

### Live Deployment URLs

| Environment | URL |
|-------------|-----|
| Development | `https://neural-justice-60077006311.development.catalystapps.in` |
| Staging | `https://staging-neural-justice.catalystapps.in` |
| Production | `https://neural-justice.catalystapps.in` |

> The Development URL above reflects the project currently provisioned under `.catalystrc` (`project_id: 52367000000021001`, `env: Development`). Confirm the exact subdomain in the Catalyst Console before sharing externally.

### Demo Credentials

Demo accounts are seeded via the `DEFAULT_LOGIN_*` development-only variables (never present in production). Use the configured `DEFAULT_LOGIN_ROLES` / `DEFAULT_LOGIN_DISTRICT_ID` / `DEFAULT_LOGIN_STATION_ID` values from your local `.env` — these allow local authentication without Catalyst. In deployed environments, log in with your assigned Catalyst Auth account (role assigned by the admin).

| Field | Source |
|-------|--------|
| Username / Email | Catalyst Auth account (or local `DEFAULT_LOGIN_*`) |
| Password | Provided by demo operator / local `DEFAULT_LOGIN_PASSWORD` |
| Role | Determined by RBAC assignment |

### Why Neural Justice Is Unique

- **Native Catalyst architecture** — every layer (hosting, gateway, AppSail, functions, Data Store, NoSQL, Stratus, ZCQL, Zia, QuickML) is a first-party Catalyst service, giving a single pane of governance, IAM, and billing.
- **Live ZCQL data path** — FIR Operations and Reports read real records from `FIR_Records` through Catalyst's native query language, not a mocked static dataset, so the demo reflects actual stored data.
- **Law-enforcement-specific intelligence** — early-warning circuits, behavioral profiling, XAI risk scoring with explainability, and patrol recommendation are purpose-built for police workflows rather than generic BI.
- **Ethically bounded AI** — individual-level demographic profiling is intentionally excluded; analytics stay at aggregate (district) level per policy.
- **Bilingual by design** — full English ↔ Kannada support via i18next + Zia Translation for field and analyst use.

---

## Technology Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Zustand, MapLibre GL, Leaflet, Recharts |
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Catalyst SDK (Node/Python) |
| AI/ML | Zoho Zia (OCR, Speech, Translation), QuickML, Custom XAI (SHAP), RAG pipeline |
| Data | PostgreSQL (Catalyst Data Store), Catalyst NoSQL, Catalyst Cache, Catalyst Stratus |
| Hosting | Zoho Catalyst (Web Client, Serverless, AppSail, API Gateway) |
| Automation | Catalyst Circuits, Signals, Cron, Push Notifications, Mail |
| CI/CD | Catalyst Pipelines (build → lint → test → deploy staging → deploy prod → rollback) |
| Quality | ESLint, Prettier, TypeScript strict mode, Pytest (unit/integration/security/performance) |

---

## Catalyst Services Used

| Service | Usage |
|---------|-------|
| Authentication | JWT + Catalyst Auth hybrid, 13-role RBAC hierarchy |
| Serverless Functions | 40+ functions (geo, OCR, speech, translation, voice, reports, search, notifications) |
| AppSail | Python 3.11 runtime for FastAPI backend |
| Web Client Hosting | Static SPA hosting with 3 environments |
| API Gateway | 25 routes with per-route CORS, rate limiting, RBAC |
| Data Store | PostgreSQL with 28 tables, 4 views, pgvector, GIN indexes |
| NoSQL | 6 collections (Conversations, Memory, Embeddings, RecordLinkCache, AnalyticsCache, AIHistory) |
| Stratus | 8 file storage buckets (reports, uploads, evidence, voice sessions) |
| Cache | 7 key patterns with TTL strategy |
| Zia Services | OCR (Kannada + English), Speech-to-Text, Text-to-Speech, Translation |
| SmartBrowz | PDF generation for reports, case summaries, conversation exports |
| QuickML | LLM provider for AI copilot, embeddings, RAG pipeline |
| Circuits | 3 workflows (FIR ingestion, case resolution, evidence retention) |
| Signals | 17 database event handlers |
| Cron | 13 scheduled jobs |
| Push Notifications | 8 templates for officer alerts |
| Mail | 4 templates for email digests |
| Pipelines | 5-stage CI/CD pipeline |

---

## Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Zoho Catalyst CLI (`catalyst`) authenticated to the `neural-justice-ksp` project

### Frontend Setup

```bash
cd frontend
npm install
```

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt  # Windows
.venv/bin/pip install -r requirements.txt     # Linux/Mac
```

### Environment Configuration

```bash
# Copy the comprehensive template from the project root
cp .env.example .env
# Or use the backend-specific template:
cp backend/.env.example backend/.env
# Edit with your local development values
```

### Running Locally

**Frontend (Development Server):**
```bash
cd frontend
npm run dev
# Access at http://localhost:5173
```

**Backend (Local Development):**
```bash
cd backend
.\run_backend.ps1  # Windows
# Or manually: .venv\Scripts\python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
# Access API at http://localhost:8000
# API docs at http://localhost:8000/api/docs
```

---

## Environment Setup

```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Fill in local development values
#    - JWT_SECRET_KEY / JWT_SECRET: generate with `python -c "import secrets; print(secrets.token_hex(32))"`
#    - ENCRYPTION_KEY: generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
#    - DATABASE_URL: `sqlite:///dev-test.db` works for local dev

# 3. Keys marked "set in Catalyst Console" are auto-injected on Catalyst
#    — leave them blank locally. Do NOT set them in .env.

# 4. Never commit .env
```

### Key Rules
- **Never commit `.env`** — it is gitignored by design.
- **Always commit `.env.example`** — it is the authoritative template.
- **Catalyst Console keys** (`CATALYST_DATASTORE_URL`, `CATALYST_ZIA_*`, etc.) are auto-injected by Zoho Catalyst in production/staging. Leave them empty locally.
- For production deployment, inject the 13 Catalyst-only keys via the Console (see [Catalyst Production Env Injection](#catalyst-production-env-injection)).

### Catalyst Production Env Injection

11 of the 13 production-only keys are **auto-injected by Zoho Catalyst** when their respective services are enabled in the project — no action needed:

| Key | Source |
|-----|--------|
| `CATALYST_DATASTORE_URL` | Auto — enabled with Data Store |
| `CATALYST_NOSQL_URL` | Auto — enabled with NoSQL |
| `CATALYST_CACHE_HOST` | Auto — enabled with Cache |
| `CATALYST_API_GATEWAY_URL` | Auto — enabled with API Gateway |
| `CATALYST_ZIA_OCR_KEY` | Auto — enabled with Zia OCR |
| `CATALYST_ZIA_SPEECH_KEY` | Auto — enabled with Zia Speech |
| `CATALYST_ZIA_TRANSLATION_KEY` | Auto — enabled with Zia Translation |
| `CATALYST_SMARTBROWZ_KEY` | Auto — enabled with SmartBrowz |
| `CATALYST_PUSH_KEY` | Auto — enabled with Push |
| `CATALYST_SIGNALS_KEY` | Auto — enabled with Signals |
| `CATALYST_AUTOML_KEY` | Auto — enabled with AutoML |

2 keys require **manual configuration** via the **Catalyst Console** web UI:

| Key | Where to Set |
|-----|-------------|
| `TURNSTILE_SECRET_KEY` | AppSail (Python backend) → Configuration → Environment Variables |
| `QUICKML_API_KEY` | QuickML → Configuration → API Keys (or AppSail → Environment Variables) |

**To set Console env vars:**
1. Go to [Catalyst Console](https://console.catalyst.zoho.com)
2. Navigate to your project → the relevant service
3. Click **Configuration** → **Environment Variables**
4. Click **Add Variable**, enter key and value, **Save**, then redeploy

**For per-function env vars:**
Add to `backend/functions/<name>/catalyst-config.json` under `env_variables`, then `catalyst deploy`.

> A reference script `scripts/inject_catalyst_env.sh` is provided with full instructions. Never commit a filled copy — only the placeholder template is safe to commit.

### Google OAuth (Catalyst Embedded Authentication)

The platform supports Google login via **Catalyst Embedded Authentication** with Google social login.

**Backend endpoint:** `POST /api/auth/google`

**Frontend:** Google Sign-In button on `LoginPage.tsx` (hidden unless `VITE_GOOGLE_CLIENT_ID` is set)

**Setup steps:**

1. **Google Cloud Console:**
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URIs:
     - `https://<your-catalyst-project>.catalystapps.in/accounts/google/callback`
     - `http://localhost:5173` (local dev)

2. **Catalyst Console → Authentication:**
   - Enable **Embedded Authentication**
   - Enable **Public Signup** (if allowing new users)
   - Click **Google** → enter Client ID + Client Secret → **Enable**

3. **Environment Variables:**

   Backend (`.env` / Catalyst Console):
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_ALLOWED_DOMAINS=ksp.gov.in,police.gov.in  # comma-separated, empty = any
   CATALYST_GOOGLE_SOCIAL_LOGIN_ENABLED=true
   ```

   Frontend (`VITE_GOOGLE_CLIENT_ID` in build config or Slate env):
   ```env
   VITE_GOOGLE_CLIENT_ID=your-google-client-id
   ```

**Security:**
- Email domain validation enforced server-side (`GOOGLE_ALLOWED_DOMAINS`)
- First-time Google users get `READ_ONLY_ANALYST` role by default
- All Google logins are audit-logged

---

## Environment Configuration

All configuration is environment-driven. The project uses **Zoho Catalyst environment variables** in production and `.env` files for local development.

### Configuration Files

| File | Purpose | Tracked? |
|------|---------|----------|
| `.env.example` | Authoritative template with all variables documented | Yes |
| `.env` | Local development overrides | **No** (.gitignore) |
| `backend/.env.example` | Backend-specific authoritative template | Yes |
| `backend/.env` | Backend-specific local overrides | **No** (.gitignore) |

### Quick Start

```bash
# 1. Copy the template
cp .env.example .env

# 2. Edit .env with your values (dev defaults already set for local dev)
# For production, set these as Catalyst Environment Variables in the console.

# 3. Required: Generate a secure JWT secret (64+ chars)
#    python -c "import secrets; print(secrets.token_hex(32))"

# 4. Required: Generate a Fernet encryption key (44 chars)
#    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Required Variables

| Variable | Description | How to Generate |
|----------|-------------|----------------|
| `JWT_SECRET_KEY` | JWT signing secret (min 64 chars) | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ENCRYPTION_KEY` | Fernet field-level encryption key | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `DATABASE_URL` | Database connection string | `sqlite:///dev-test.db` for local; PostgreSQL for Catalyst |

> **Security Note:** Set `JWT_SECRET` to the **same value** as `JWT_SECRET_KEY` for Catalyst API Gateway compatibility.

### Environment Variables by Category

All documented variables are in `.env.example` with placeholder values. Below are the key groups:

#### Authentication & Security
- `JWT_SECRET_KEY`, `JWT_SECRET` — JWT signing (set both to same value)
- `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRE_DAYS`
- `ENCRYPTION_KEY` — Fernet key for PII field encryption
- `CORS_ORIGINS` — Comma-separated allowed origins
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile CAPTCHA (required for production)
- `CSRF_COOKIE_SECURE`, `HELMET_ENABLED`

#### Database & Storage
- `DATABASE_URL` — SQLite for dev, PostgreSQL for Catalyst prod
- `CATALYST_DATASTORE_URL`, `CATALYST_NOSQL_URL`, `CATALYST_STRATUS_BUCKET_PREFIX`
- `CATALYST_CACHE_HOST` + `CATALYST_CACHE_TTL_*` — Cache configuration

#### Zoho Catalyst Services
- `CATALYST_PROJECT_ID`, `CATALYST_ENVIRONMENT`
- `CATALYST_ZIA_OCR_KEY`, `CATALYST_ZIA_SPEECH_KEY`, `CATALYST_ZIA_TRANSLATION_KEY`
- `CATALYST_SMARTBROWZ_KEY`, `CATALYST_MAIL_SENDER`, `CATALYST_PUSH_KEY`
- `CATALYST_SIGNALS_KEY`, `CATALYST_AUTOML_KEY`

#### AI / LLM
- `MOCK_AI` — Set `true` for local dev without a live LLM provider
- `AI_PROVIDER` — `ollama` (local) or `quickml` (Catalyst)
- `QUICKML_API_KEY` — Required if using QuickML provider
- `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`, `AI_ENABLE_CACHE`

#### Logging & Monitoring
- `LOG_LEVEL` — `DEBUG`, `INFO`, `WARNING`, `ERROR`
- `LOG_FORMAT` — `json` or `text`
- `NJ_REQUEST_TIMING` — Set `true` for per-request timing logs

#### Data Governance
- `DATA_RETENTION_DAYS_CASES`, `DATA_RETENTION_DAYS_EVIDENCE`, `DATA_RETENTION_DAYS_AUDIT`
- `AI_LOG_RETENTION_DAYS`, `DATA_ANONYMIZE_AFTER_DAYS`
- `PURPOSE_LIMITATION_CHECK_ENABLED`

#### Development Only
- `DEFAULT_LOGIN_PASSWORD`, `DEFAULT_LOGIN_ROLES`, `DEFAULT_LOGIN_DISTRICT_ID`, `DEFAULT_LOGIN_STATION_ID`
  — Allow local authentication without Catalyst. **Remove these in production.**

### Environment Separation

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `ENVIRONMENT` | `development` | `staging` | `production` |
| `MOCK_AI` | `true` | `false` | `false` |
| `TURNSTILE_SECRET_KEY` | (optional) | Required | Required |
| `CORS_ORIGINS` | `http://localhost:5173` | Staging URL | Production URL |
| `LOG_LEVEL` | `DEBUG` | `INFO` | `WARNING` |

### Backward Compatibility Notes

- `JWT_SECRET` is a Catalyst-compatible alias for `JWT_SECRET_KEY`. Set both to the same value.
- `CACHE_TTL_*` (legacy names) work as fallbacks if `CATALYST_CACHE_TTL_*` is not set.
- `RATE_LIMIT_DEFAULT` / `RATE_LIMIT_WINDOW_SECONDS` (legacy) fall back when `CATALYST_API_RATE_LIMIT_*` not set.

### Security Best Practices

1. **Never commit `.env` files** — they are gitignored. Only commit `.env.example`.
2. **Generate unique secrets** per environment (dev/staging/prod should all have different keys).
3. **Rotate secrets** periodically using the Catalyst Console.
4. **Use Catalyst Secrets** for sensitive values in production deployments.
5. **Restrict `CORS_ORIGINS`** to only the domains that serve your application.
6. **Enable `TURNSTILE_SECRET_KEY`** in staging and production.

---

## Deployment

```bash
# Frontend (static build to Catalyst Web Client Hosting)
cd frontend
npm run build
catalyst deploy --environment prod

# Backend / Serverless / Pipelines
catalyst deploy --environment dev      # Development
catalyst deploy --environment staging   # Staging
catalyst deploy --environment prod      # Production
```

### Available Scripts

**Root (TypeScript build/lint):**
```bash
npm run build          # Compile TypeScript (shared/backend)
npm run typecheck      # Type check without emitting
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier format
npm run format:check   # Prettier check
```

**Frontend:**
```bash
cd frontend
npm run dev            # Start Vite dev server (http://localhost:5173)
npm run build          # Build for production
npm run preview        # Preview production build
```

**Backend:**
```bash
cd backend
.\run_backend.ps1     # Start FastAPI server (Windows)
# API available at http://localhost:8000
# API docs at http://localhost:8000/api/docs
```

### Environments

| Environment | URL |
|-------------|-----|
| Development | `https://dev-neural-justice.catalystapps.in` |
| Staging | `https://staging-neural-justice.catalystapps.in` |
| Production | `https://neural-justice.catalystapps.in` |

---

## Project Structure

```
neural-justice/
├── backend/
│   ├── ai/                 # LLM providers, RAG pipeline, orchestration, guardrails
│   ├── api/                # FastAPI route handlers, middleware, dependencies
│   ├── early_warning/      # Circuit-driven detectors, alert templates
│   ├── functions/          # Catalyst serverless functions (Node/Python)
│   ├── geo/                # Geospatial analytics, hotspots, heatmaps, routes
│   ├── intelligence/       # Crime patterns, profiling, scoring, forecasting
│   ├── security/           # Auth, RBAC/ABAC, encryption, audit, data masking
│   ├── database/           # SQLAlchemy models, migrations, repositories
│   ├── services/           # Reports, storage, notifications, mail
│   ├── speech/             # Zia STT/TTS integration
│   ├── translation/        # Zia translation service
│   ├── ocr/                # Zia OCR integration
│   ├── network/            # Criminal network analysis
│   ├── voice/              # Voice pipeline (STT → translate → AI → TTS)
│   ├── cache/              # Cache manager with TTL
│   ├── nosql/              # NoSQL collection definitions
│   └── *.json              # Catalyst configs
├── frontend/src/
│   ├── api/                # API client and type definitions
│   ├── components/         # Reusable UI components (AI, Analytics, Common, Dashboard, etc.)
│   ├── hooks/              # React hooks (useAuth, useFirs, useRiskScores, useTheme)
│   ├── Layers/             # MapLibre layer definitions (FIR, Station, Heatmap, Hotspot, etc.)
│   ├── Map/                # Map components and utilities (MapLibreConfig, MapEngine, geoClient)
│   ├── Geo/                # Geospatial components (MapView, LeafletMapView, DynamicMapView)
│   ├── pages/              # Route-level page components (Dashboard, FIR, Analytics, Geo, etc.)
│   ├── store/              # Zustand state management (authStore, dashboardStore, rightDrawerStore)
│   ├── types/              # TypeScript type definitions (geo, dashboard, early_warning, etc.)
│   ├── design-system/      # UI component library (Radix UI + Tailwind)
│   ├── i18n/               # Internationalization (English, Kannada)
│   └── utils/              # Utility functions (clampMetric, formatStatus)
├── shared/                 # Cross-cutting middleware, services, types
├── infrastructure/         # Catalyst pipeline definitions
├── tests/                  # API, integration, security, performance tests
└── scripts/                # Database seeding and utility scripts
```

---

## Security

- **Authentication**: JWT + Catalyst Auth hybrid with 13-role hierarchy (from State-level admin to IO-level)
- **Authorization**: RBAC (22 resource types × 7 access levels) + ABAC (district/station jurisdiction)
- **Data Protection**: Fernet encryption, PII masking (Aadhaar, phone, name, address)
- **Audit Logging**: Comprehensive audit trail across all operations and admin actions
- **Input Validation**: Prompt injection protection, SQL injection prevention, XSS sanitization
- **API Security**: CORS lock to authorized domains, CSP headers, rate limiting, CAPTCHA
- **Secrets Management**: No hardcoded secrets; all credentials via environment variables only

---

## API Overview

The backend exposes 25+ API routes organized by domain:

| Domain | Prefix | Endpoints |
|--------|--------|-----------|
| Authentication | `/api/auth` | Login, logout, token refresh, user info |
| FIRs | `/api/firs` | CRUD operations, search, filtering, export |
| Intelligence | `/api/intelligence/v1` | Risk scoring, profiles, patterns, warnings, recommendations, forecast, networks |
| AI Copilot | `/api/ai` | Conversational AI, FIR analysis, NL2SQL, statistical queries |
| Analytics | `/api/analytics` | Dashboard metrics, trends, crime statistics |
| Geo | `/geo` | Geospatial analytics, hotspots, heatmaps, routes |
| Voice | `/api/v1` | Voice AI copilot (STT → translate → AI → TTS) |
| Notifications | `/api/notifications` | Push notifications, alerts, digests |
| Search | `/api` | Global search across FIRs, accused, victims |
| Translation | `/api/translation` | Zia translation service (English ↔ Kannada) |
| Reports | `/api` | Report generation, PDF export |
| Settings | `/api` | User settings, preferences |
| Finance | `/api` | Financial crime analysis (future) |

**Interactive API Documentation**: Available at `/api/docs` (Swagger UI) when running locally.

---

## Database

### Schema Overview

The application uses PostgreSQL with 28+ tables organized by domain:

| Domain | Tables |
|--------|--------|
| Core | `fir_cases`, `accused`, `victims`, `crime_heads`, `police_stations`, `districts` |
| Intelligence | `risk_scores`, `behavior_profiles`, `crime_patterns`, `forecasts` |
| Geo | `hotspots`, `geo_layers`, `patrol_routes` |
| Early Warning | `early_warnings`, `alert_templates`, `officer_alerts` |
| Audit | `audit_logs`, `admin_actions` |
| AI | `ai_conversations`, `ai_memory`, `ai_embeddings` |

### Migrations

Database migrations are managed using Alembic:

```bash
cd backend
alembic upgrade head    # Apply all migrations
alembic downgrade -1    # Rollback one migration
alembic revision --autogenerate -m "description"  # Create new migration
```

---

## Authentication Flow

1. **Login**: User submits credentials to `/api/auth/login`
2. **Token Generation**: Backend validates credentials and returns JWT access token + refresh token
3. **Token Storage**: Frontend stores tokens in Zustand store (authStore)
4. **Protected Routes**: All API requests include `Authorization: Bearer <token>` header
5. **Token Refresh**: Access tokens expire after configured duration (default: 1 hour); refresh tokens used to obtain new access tokens
6. **Session Validation**: Frontend checks authentication status on app load and route changes
7. **Logout**: Tokens are cleared from store and backend session is invalidated

### Role Hierarchy

The system implements a 13-role RBAC hierarchy:

1. SUPER_ADMIN
2. STATE_ADMIN
3. DISTRICT_ADMIN
4. STATION_ADMIN
5. SENIOR_IO
6. IO (Investigating Officer)
7. ASSISTANT_IO
8. ANALYST
9. PATROL_OFFICER
10. DISPATCHER
11. VIEWER
12. REPORTER
13. GUEST

Each role has specific permissions for 22 resource types with 7 access levels (none, view, create, edit, delete, approve, admin).

---

## Troubleshooting

### Common Issues

**Issue: Frontend build fails with TypeScript errors**
```bash
# Solution: Run typecheck to identify specific errors
npm run typecheck
# Fix errors in source files, then rebuild
npm run build
```

**Issue: Backend fails to start with "JWT_SECRET_KEY required"**
```bash
# Solution: Set required environment variables
cd backend
cp .env.example .env.dev
# Edit .env.dev and set JWT_SECRET_KEY, ENCRYPTION_KEY, DATABASE_URL
```

**Issue: Map tiles not loading**
- Check CSP headers in `vite.config.ts` include map tile domains
- Verify network connectivity to map tile servers (OpenFreeMap, MapTiler)
- Check browser console for CSP violations

**Issue: AI Copilot returns mock responses**
- Check `MOCK_AI` environment variable is set to `false`
- Verify QuickML service credentials are configured
- Check backend logs for AI provider connection errors

**Issue: Database connection fails**
- Verify `DATABASE_URL` is correctly formatted
- Check PostgreSQL server is running and accessible
- Ensure database user has required permissions

**Issue: CORS errors in browser**
- Verify `CORS_ORIGINS` includes your frontend URL
- Check API Gateway CORS configuration in Catalyst
- Ensure frontend proxy configuration is correct

---

## Contributing

### Development Workflow

1. **Create a feature branch**: `git checkout -b feature/your-feature-name`
2. **Make changes**: Follow existing code style and patterns
3. **Test locally**: Run frontend and backend, verify functionality
4. **Run linting**: `npm run lint` and `npm run format`
5. **Type check**: `npm run typecheck`
6. **Commit**: Use clear commit messages following conventional commits
7. **Push**: Push to your fork and create a pull request

### Code Style

- **Frontend**: TypeScript strict mode, ESLint, Prettier, Tailwind CSS
- **Backend**: Python type hints, PEP 8 style, Black formatter
- **Components**: PascalCase for React components, camelCase for utilities
- **Files**: kebab-case for non-component files, PascalCase for component folders

### Testing

Run the test suite before submitting changes:

```bash
# Backend tests
cd backend
pytest

# Frontend tests (if available)
cd frontend
npm test
```

---

## Performance Optimizations

The application implements several performance optimizations:

- **Code Splitting**: React lazy loading for route-level components
- **Bundle Optimization**: Vite manual chunks for vendor, maps, charts, icons
- **Caching**: Catalyst Cache with TTL strategy for dashboard (300s), analytics (600s), recent FIR (120s)
- **Database Indexing**: GIN indexes on frequently queried columns
- **Map Performance**: Layer visibility management, lazy loading of map layers
- **API Rate Limiting**: Per-route rate limiting to prevent abuse
- **Asset Optimization**: Minified CSS/JS, compressed assets, sourcemaps disabled in production

---

## Current Limitations

- **Financial Crime Analysis**: Transaction link analysis and financial network visualization are not included in this release. This module is under development for a future iteration.
- **Sociological Insights**: Aggregate-level demographic crime analysis is available through geo-spatial analytics. Individual-level sociological profiling is intentionally excluded per ethical guidelines that prohibit demographic-based profiling.
- **Conversation Storage**: In production, conversation memory uses Catalyst Data Store. Local JSON file fallback is provided for development environments without database connectivity.

---

## Future Roadmap

- Financial Crime Analysis module (transaction pattern detection, money trail analysis)
- Enhanced sociological insights using aggregate census data (district-level only, no individual profiling)
- Mobile application for field officers
- Real-time facial recognition integration
- Advanced NLP for Kannada-language FIR processing
- Automated report generation with ML-powered insights

---

## License

MIT — Copyright (c) 2026 Karnataka State Police. See [LICENSE](LICENSE).

---

## Contributors

Neural Justice Engineering Team — Karnataka State Police AI Crime Intelligence Program.
