"""FastAPI application entry point for Neural Justice.

Start with::

    uvicorn backend.api.main:app --host 127.0.0.1 --port 8001 --reload
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env before anything else
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from backend.api.routes.copilot import router as copilot_router

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

app.include_router(copilot_router)


# ── Health ────────────────────────────────────────────────────────────────────


@app.get("/api/health", tags=["System"])
async def health():
    """Basic health check."""
    return {
        "status": "healthy",
        "app": "Neural Justice",
        "environment": os.environ.get("ENVIRONMENT", "development"),
    }
