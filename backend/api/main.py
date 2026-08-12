"""FastAPI application entry point for Neural Justice.

Start with::

    uvicorn backend.api.main:app --host 127.0.0.1 --port 8001 --reload
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env before anything else
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from backend.api.copilot.router import router as copilot_v2_router
from backend.pipeline.router import router as pipeline_router
from backend.api.routes.copilot import router as copilot_router
from backend.api.copilot.auth import get_current_user
from backend.api.routes.reports import router as reports_router
from backend.api.routes.stations import router as stations_router
from backend.api.routes.profiles import router as profiles_router
from backend.api.routes.cases import router as cases_router
from backend.api.routes.orders import router as orders_router
from backend.api.routes.activity import router as activity_router
from backend.api.routes.notifications import router as notifications_router
from backend.api.routes.situation_room import router as situation_room_router
from backend.api.routes.patrol import router as patrol_router
from backend.api.routes.crime_patterns import router as crime_patterns_router
from backend.api.routes.dashboard import router as dashboard_router
from backend.api.routes.cp import router as cp_router

logger = logging.getLogger("nj.api.main")

# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Neural Justice API starting up")
    yield
    logger.info("Neural Justice API shutting down")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Neural Justice API",
    version="1.0.0",
    description="Police intelligence platform backend — FIR management, AI Copilot, analytics",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────

origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

# SECURITY (F-009/F-017): copilot + pipeline routes are privileged. Enforce
# authentication on every route. The v2 copilot router also applies per-route
# authorization; the v1 copilot router and pipeline router get it here.
app.include_router(copilot_router, dependencies=[Depends(get_current_user)])
app.include_router(copilot_v2_router, prefix="/api/copilot")
app.include_router(pipeline_router, prefix="/api/v1", dependencies=[Depends(get_current_user)])
app.include_router(reports_router)
app.include_router(stations_router)
app.include_router(profiles_router)
app.include_router(cases_router)
app.include_router(orders_router)
app.include_router(activity_router)
app.include_router(notifications_router)
app.include_router(situation_room_router)
app.include_router(patrol_router)
app.include_router(crime_patterns_router)
app.include_router(dashboard_router)
app.include_router(cp_router)


# ── Health ────────────────────────────────────────────────────────────────────


@app.get("/api/health", tags=["System"])
async def health():
    """Basic health check."""
    return {
        "status": "healthy",
        "app": "Neural Justice",
        "environment": os.environ.get("ENVIRONMENT", "development"),
    }
