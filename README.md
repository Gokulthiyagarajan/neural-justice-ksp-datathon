# Neural Justice

**Enterprise AI Crime Intelligence Platform for Karnataka State Police (KSP)**

[![Deployed on Catalyst](https://img.shields.io/badge/Deployed%20on-Zoho%20Catalyst-blue)](https://catalyst.zoho.com)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Live Deployment

| Environment | URL | Status |
|-------------|-----|--------|
| **Production (Demo)** | <https://neural-justice-60077006311.development.catalystserverless.in/app/index.html> | ✅ Live |
| **Backend API** | <https://neural-justice-60077006311.development.catalystserverless.in/server/neural-justice-backend/> | ✅ Live |
| **GitHub Repository** | <https://github.com/Gokulthiyagarajan/neural-justice-ksp-datathon> | ✅ Public |

---

## Demo Credentials (For Judges/Reviewers)

> **Important**: TOTP (Time-based One-Time Password) is **mandatory** for all logins. Use any authenticator app (Google Authenticator, Authy, Microsoft Authenticator).

### Option 1: Demo Account (Recommended for Quick Access)
| Field | Value |
|-------|-------|
| **Username** | `demo` |
| **Password** | `demo` |
| **TOTP Secret** | `JBSWY3DPEHPK3PXP` |
| **TOTP Code** | Use authenticator app with above secret, **OR** enter `123456` as fallback |

### Option 2: Admin Account
| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `test123` |
| **TOTP** | Required — scan QR code shown after first login, or use authenticator app |

### Option 3: Role-Based Demo Accounts (All use same password)
| Role | Username | Password | Scope |
|------|----------|----------|-------|
| Commissioner (CP) | `cp_demo` | `demo123` | State-wide |
| Superintendent (SP) | `sp_demo` | `demo123` | District-level |
| Inspector (PI) | `pi_demo` | `demo123` | Station-level |
| Sub-Inspector (PSI) | `psi_demo` | `demo123` | Station-level |
| Police Constable (PC) | `pc_demo` | `demo123` | Assigned cases only |

> **TOTP for all accounts**: Use authenticator app with secret `JBSWY3DPEHPK3PXP` or fallback code `123456`

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.11+
- **SQLite** (included) or PostgreSQL
- **Zoho Catalyst CLI** (for deployment): `npm i -g @zoho/catalyst-cli`

### 1. Clone & Install
```bash
git clone https://github.com/Gokulthiyagarajan/neural-justice-ksp-datathon.git
cd neural-justice-ksp-datathon
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Create .env.local from template
cp .env.local.example .env.local
# Edit .env.local if needed (VITE_API_URL for local backend)
npm run dev
# Frontend runs at http://localhost:5173
```

### 3. Backend Setup (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Create .env from template
cp .env.example .env
# Edit .env with your JWT_SECRET_KEY, ENCRYPTION_KEY, DATABASE_URL
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
# API runs at http://localhost:8000
# Swagger docs at http://localhost:8000/api/docs
```

### 4. Catalyst Function (Serverless Backend)
```bash
cd functions/neural-justice-backend
# Uses pure Python stdlib + sqlite3 — no external dependencies
# Deploy via Catalyst CLI:
catalyst deploy
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Web Client (React SPA)                        │
│  Vite · TypeScript · Tailwind · MapLibre · Leaflet · Zustand    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / API Gateway
┌────────────────────────────▼────────────────────────────────────┐
│              Catalyst API Gateway (25 routes)                    │
│         CORS · Rate Limiting · RBAC · JWT Auth                  │
├────────────────────────────┬────────────────────────────────────┤
│    Python API FastAPI      │   Serverless Functions (Python)    │
│    Auth · FIRs · AI        │   Geo · OCR · Speech · Translation │
│    Analytics · Risk        │   Voice · Reports · Search         │
│    Profiles · Warnings     │   Notifications · Data Sync        │
├──────────┬─────────────────┴──────────┬─────────────────────────┤
│  Data Store (PostgreSQL)             │  NoSQL (Document Store)  │
│  fir_cases · accused · victims       │  Conversations · Memory  │
│  police_stations · districts         │  Embeddings · AIHistory  │
│  crime_heads · risk_scores           │                          │
│  early_warnings · forecasts          │                          │
├──────────┬───────────────────────────┴──────────────────────────┤
│  Stratus (File Storage) │  Cache · QuickML · SmartBrowz         │
│  Circuits · Signals     │  Cron · Push · Mail · Pipelines        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Modules
| Module | Description | Roles |
|--------|-------------|-------|
| **FIR Management** | Search, filter, export FIRs with full case details | All |
| **Dashboard & Analytics** | KPI cards, crime trends (30/60/90/180-day), incident mapping | CP, SP, PI |
| **Geospatial Intelligence** | Dual-engine maps (MapLibre + Leaflet), heatmaps, hotspots, timeline replay | SP, PI, PSI |
| **Crime Hotspots** | Density analysis, patrol recommendation, hotspot reports | SP, PI |
| **Early Warning System** | Circuit-driven detectors (spikes, repeat offenders, patterns) | CP, SP, PI |
| **Behavioral Profiling** | Accused risk profiles, crime types, associates, explainability | PI, PSI |
| **Risk Scoring (XAI)** | Calibrated scores with SHAP-style breakdown | PI, PSI |
| **Crime Patterns** | Cluster detection, MO similarity, emerging threats | CP, SP, PI |
| **Forecasting** | Probabilistic crime forecasts by district/type | SP, PI |
| **Criminal Network Analysis** | Co-accused graphs, ring detection | SP, PI |
| **AI Copilot** | Multi-mode assistant (FIR search, case analysis, NL2SQL) | All |
| **Voice & Documents** | Zia OCR, STT/TTS, translation, document upload | All |

---

## Role-Based Access (13-Role RBAC)

| Level | Role | Scope |
|-------|------|-------|
| 1 | `SUPER_ADMIN` | Platform administration |
| 2 | `STATE_ADMIN` | State-wide configuration |
| 3 | `DISTRICT_ADMIN` | District configuration |
| 4 | `STATION_ADMIN` | Station management |
| 5 | `SENIOR_IO` | Senior investigating officer |
| 6 | `IO` | Investigating officer |
| 7 | `ASSISTANT_IO` | Assistant IO |
| 8 | `ANALYST` | Crime analyst |
| 9 | `PATROL_OFFICER` | Patrol duties |
| 10 | `DISPATCHER` | Dispatch/control room |
| 11 | `VIEWER` | Read-only access |
| 12 | `REPORTER` | Report generation |
| 13 | `GUEST` | Limited demo access |

---

## Project Structure

```
neural-justice/
├── backend/                    # FastAPI backend
│   ├── api/
│   │   ├── main.py            # FastAPI app entry
│   │   └── routes/            # API route modules
│   ├── ai/                    # AI/ML layer (QuickML, RAG, providers)
│   ├── database/              # SQLAlchemy models, migrations
│   ├── early_warning/         # Circuit-driven detectors
│   ├── geo/                   # Geospatial analytics
│   ├── intelligence/          # Crime patterns, profiling, forecasting
│   ├── network/               # Criminal network analysis
│   ├── security/              # Auth, RBAC/ABAC, encryption, audit
│   └── functions/             # Catalyst serverless functions
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/               # API clients
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level pages by role
│   │   │   ├── cp/            # Commissioner pages
│   │   │   ├── sp/            # Superintendent pages
│   │   │   ├── pi/            # Inspector pages
│   │   │   ├── psi/           # Sub-Inspector pages
│   │   │   ├── pc/            # Constable pages
│   │   │   └── dashboards/    # Role-specific dashboards
│   │   ├── store/             # Zustand state management
│   │   ├── hooks/             # Custom React hooks
│   │   ├── design-system/     # Component library (Radix + Tailwind)
│   │   ├── i18n/              # English + Kannada
│   │   └── utils/             # Utilities
│   └── public/                # Static assets
├── functions/                  # Catalyst Advanced I/O functions
│   └── neural-justice-backend/ # Main serverless handler
├── shared/                     # Cross-cutting types, middleware
├── tests/                      # Pytest + TypeScript tests
├── scripts/                    # Database seeding, utilities
├── infrastructure/             # Catalyst pipeline definitions
├── .catalystrc                # Catalyst project config
├── catalyst.json              # Deployment manifest
└── README.md                  # This file
```

---

## Environment Configuration

### Required Variables (Production)
```bash
# Authentication
JWT_SECRET_KEY=<64-char-hex>        # Generate: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=<same-as-above>          # Must match JWT_SECRET_KEY
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# Encryption
ENCRYPTION_KEY=<44-char-base64>     # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname  # Catalyst Data Store

# Catalyst Services (auto-injected in production)
CATALYST_DATASTORE_URL=
CATALYST_NOSQL_URL=
CATALYST_ZIA_OCR_KEY=
CATALYST_ZIA_SPEECH_KEY=
CATALYST_ZIA_TRANSLATION_KEY=
CATALYST_SMARTBROWZ_KEY=
CATALYST_PUSH_KEY=
CATALYST_SIGNALS_KEY=
CATALYST_AUTOML_KEY=

# Manual (set in Catalyst Console)
TURNSTILE_SECRET_KEY=
QUICKML_API_KEY=
```

### Development Variables (`.env`)
```bash
ENVIRONMENT=development
MOCK_AI=true                          # Use mock AI responses
PROVIDER=quickml
DATABASE_URL=sqlite:///dev-test.db
DEFAULT_LOGIN_PASSWORD=test123
DEFAULT_LOGIN_ROLES=["SUPER_ADMIN"]
DEFAULT_LOGIN_DISTRICT_ID=1
DEFAULT_LOGIN_STATION_ID=1
```

---

## API Endpoints (Key)

| Domain | Prefix | Key Endpoints |
|--------|--------|---------------|
| Auth | `/api/auth` | `POST /login`, `POST /verify-mfa`, `POST /logout` |
| FIRs | `/api/firs` | `GET /`, `GET /{crime_no}`, `GET /{crime_no}/timeline` |
| FIR Operations | `/api/fir-ops` | `GET /` (district-filtered FIRs) |
| Stations | `/api/stations` | `GET /`, `GET /{id}`, `GET /{id}/stats` |
| Cases | `/api/cases` | `GET /`, `GET /{id}` |
| Orders | `/api/orders` | `GET /` |
| Activity | `/api/activity` | `GET /` |
| Notifications | `/api/notifications` | `GET /`, `GET /unread-count` |
| Profiles | `/api/criminal-profiles` | `GET /`, `GET /{id}` |
| Patrol | `/api/patrol` | `GET /` |
| Crime Patterns | `/api/crime-patterns` | `GET /` |
| Dashboard | `/api/dashboard` | `GET /metrics`, `/trend`, `/districts`, `/stations`, `/sp-metrics`, `/pi-metrics`, `/psi-metrics`, `/pc-metrics`, `/cp-metrics` |
| AI Copilot | `/api/ai` | `POST /copilot`, `POST /copilot/chat`, `POST /query`, `GET /sessions` |
| **CP (Commissioner)** | `/api/cp` | `GET /stations`, `/districts`, `/warnings`, `/cases`, `/audit`, `/ai-situation`, `/activity`, `/notifications`, `/networks`, `/timeline`, `/media`, `/intelligence`, `/risk`, `/gis-data`, `/reports`, `/forecast`, `/patterns`, `/finance`, `/patrol`, `/officers`, `/orders`, `/coordination`, `/settings` |

---

## Deployment

### Catalyst CLI (Recommended)
```bash
# Login to Catalyst
catalyst login

# Deploy everything
catalyst deploy

# Deploy specific components
catalyst deploy --only functions
catalyst deploy --only client
```

### Manual Deploy Commands
```bash
# Frontend build
cd frontend && npm run build --mode production

# Backend (AppSail)
cd backend && catalyst deploy --app-sail

# Functions
cd functions/neural-justice-backend && catalyst deploy --functions
```

---

## Testing

```bash
# Backend tests
cd backend
pytest -v --cov=backend --cov-report=html

# Frontend type-check
cd frontend
npm run type-check

# Lint
npm run lint

# E2E (requires running dev servers)
npm run test:e2e
```

---

## Data Sources

- **Primary**: Karnataka State Police FIR dataset (Police_FIR_Dataset_CSVs)
  - 450 FIRs, 48 stations, 31 districts, 4 divisions, 8 crime heads
  - Accused (640), Victims (482), Employees (484)
- **Synthetic**: Demo data for dashboards, analytics, AI context
- **Geospatial**: OpenStreetMap tiles, MapLibre styles

---

## Security

- **Authentication**: JWT + TOTP (RFC 6238) mandatory
- **Authorization**: RBAC (13 roles) + ABAC (district/station jurisdiction)
- **Encryption**: Fernet (AES-256) for PII fields
- **Audit Logging**: All actions logged with user, timestamp, IP
- **Input Validation**: Prompt injection protection, SQL injection prevention, XSS sanitization
- **Rate Limiting**: Per-route limits via Catalyst API Gateway
- **CORS**: Locked to authorized domains only
- **Secrets**: Zero hardcoded secrets; all via environment variables

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Follow code style: TypeScript strict, Python type hints, Black formatter
4. Run tests: `pytest` / `npm run type-check`
5. Commit: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
6. Push and create Pull Request

---

## License

MIT License — Copyright (c) 2026 Karnataka State Police. See [LICENSE](LICENSE).

---

## Acknowledgments

- **Karnataka State Police** — Domain expertise & data
- **Zoho Catalyst** — Platform & services
- **OpenStreetMap** — Map tiles
- **MapLibre & Leaflet** — Mapping engines
- **Radix UI & Tailwind CSS** — Design system

---

## Support

For demo access issues or technical questions:
- **GitHub Issues**: <https://github.com/Gokulthiyagarajan/neural-justice-ksp-datathon/issues>
- **KSP IT Helpdesk**: 080-2294-3000 (24/7)
- **Email**: neuraljustice@neuraljustice.jo3.org