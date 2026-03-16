# main.py
# ============================================
# APPLICATION ENTRYPOINT
# ============================================
# This file should stay THIN.
# Its only job: wire everything together.
#
# Business logic  → app/services/
# Route handlers  → app/routers/
# DB models       → app/models/
# Config          → app/core/config.py
# ============================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logger import setup_logging, logger
from app.core.database import check_database_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan handler runs code at startup and shutdown.
    Replaces deprecated @app.on_event("startup")

    Everything BEFORE yield → runs at startup
    Everything AFTER yield  → runs at shutdown
    """

    # ---- STARTUP ----
    setup_logging()

    logger.info(
        "nexus_starting",
        environment=settings.ENVIRONMENT,
        version="0.1.0",
        llm_provider=settings.LLM_PROVIDER
    )

    # Verify database is reachable before accepting traffic
    db_healthy = await check_database_connection()
    if not db_healthy:
        # Fail fast — don't start if DB unreachable
        raise RuntimeError("Cannot connect to database. Stopping.")

    logger.info("nexus_ready")

    yield
    # ↑ Application runs here

    # ---- SHUTDOWN ----
    logger.info("nexus_stopping")


# ----------------------------------------
# CREATE APP
# ----------------------------------------
app = FastAPI(
    title="NEXUS API",
    description="Autonomous API Integration & Self-Healing Platform",
    version="0.1.0",

    # Auto-generated API docs
    # Disabled in production — exposes your entire API structure
    # An attacker seeing all your endpoints = free recon
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,

    lifespan=lifespan
)


# ----------------------------------------
# CORS MIDDLEWARE
# Controls which domains can call our API
#
# WHY this matters:
#   Without CORS: any website can call your API
#   With CORS: only approved domains can call it
#
# allow_credentials=True is REQUIRED
# for httpOnly cookies to work across
# frontend (port 3000) → backend (port 8000)
# ----------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------
# HEALTH CHECK
# ----------------------------------------
# Every production service exposes /health
# Load balancers ping this every 30 seconds
# Non-200 response → container gets restarted
#
# This is how Kubernetes knows your app is alive
# This is how Docker healthcheck works
# This is standard production practice
# ----------------------------------------
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
        "llm_provider": settings.LLM_PROVIDER
    }


# ----------------------------------------
# ROUTERS
# Uncomment as we build each feature
# ----------------------------------------
# from app.routers import auth
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])