from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logger import setup_logging, logger
from app.core.database import check_database_connection
from app.routers import auth
from app.routers import converse


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info(
        "nexus_starting",
        environment=settings.ENVIRONMENT,
        version="0.1.0",
        llm_provider=settings.LLM_PROVIDER
    )
    db_healthy = await check_database_connection()
    if not db_healthy:
        raise RuntimeError("Cannot connect to database. Stopping.")
    logger.info("nexus_ready")
    yield
    logger.info("nexus_stopping")


app = FastAPI(
    title="NEXUS API",
    description="Autonomous API Integration & Self-Healing Platform",
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
        "llm_provider": settings.LLM_PROVIDER
    }

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(converse.router, prefix="/api/converse", tags=["Converse"])