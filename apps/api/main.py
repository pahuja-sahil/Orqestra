import uuid
import asyncio
import structlog
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from starlette.middleware.trustedhost import TrustedHostMiddleware
from app.core.config import settings
from app.core.logger import setup_logging, logger
from app.core.database import check_database_connection, check_database_health
from app.core.circuit_breaker import get_redis
from app.core.rate_limiter import RedisRateLimiter
from app.routers import auth
from app.routers import converse
from app.routers import integrations
from app.routers import github


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info(
        "orqestra_starting",
        environment=settings.ENVIRONMENT,
        version="0.1.0",
        llm_provider=settings.LLM_PROVIDER
    )
    db_healthy = await check_database_connection()
    if not db_healthy:
        raise RuntimeError("Cannot connect to database. Stopping.")
    
    # Create tables + seed sample docs only in development
    if settings.ENVIRONMENT == "development":
        try:
            from app.core.database import engine, Base
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("database_tables_created")
        except Exception as e:
            logger.warning("table_creation_error", error=str(e))

        try:
            from app.services.vector_service import get_or_create_collection, ingest_document
            collection = get_or_create_collection("api_docs")
            if collection.count() == 0:
                logger.info("ingesting_sample_docs")
                await ingest_document(
                    text="""
                    Stripe API allows developers to accept payments online.
                    Use the Payment Intents API to create payments.
                    Endpoint: POST https://api.stripe.com/v1/payment_intents
                    Required: amount (in cents), currency (e.g. usd)
                    Auth: Bearer token with secret key sk_test_...
                    Confirm payment: POST /v1/payment_intents/{id}/confirm
                    Webhooks notify your app on payment.succeeded or payment.failed
                    Register webhooks in your Stripe dashboard.

                    GitHub API allows access to repositories and code.
                    Endpoint: https://api.github.com
                    Auth: Bearer token or OAuth
                    List repos: GET /user/repos
                    Create repo: POST /user/repos
                    Get file: GET /repos/{owner}/{repo}/contents/{path}

                    Twilio API allows sending SMS and voice calls.
                    Endpoint: https://api.twilio.com/2010-04-01
                    Auth: Account SID and Auth Token
                    Send SMS: POST /Accounts/{SID}/Messages
                    Required: To, From, Body fields
                    """,
                    source="sample_docs"
                )
                logger.info("sample_docs_ingested")
        except Exception as e:
            logger.warning("sample_docs_failed", error=str(e))

    # Track background tasks for graceful shutdown
    _background_tasks: list = []

    logger.info("orqestra_ready")
    yield
    logger.info("orqestra_stopping")

    # Graceful shutdown: wait for active background tasks
    if _background_tasks:
        logger.info("awaiting_background_tasks", count=len(_background_tasks))
        remaining = [t for t in _background_tasks if not t.done()]
        for t in remaining:
            try:
                await asyncio.wait_for(asyncio.shield(t), timeout=5)
            except Exception:
                pass


app = FastAPI(
    title="ORQESTRA API",
    description="Autonomous API Integration & Self-Healing Platform",
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

def _parse_allowed_origins() -> list:
    origins = ["http://localhost:5173", "http://localhost:3000", "http://localhost"]
    if settings.ALLOWED_ORIGINS:
        extras = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
        origins.extend(extras)
    if settings.FRONTEND_URL and settings.FRONTEND_URL not in origins:
        origins.append(settings.FRONTEND_URL)
    return list(dict.fromkeys(origins))


app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

if settings.ENVIRONMENT == "production":
    frontend_host = settings.FRONTEND_URL.replace("http://", "").replace("https://", "").split("/")[0]
    backend_host = settings.BACKEND_URL.replace("http://", "").replace("https://", "").split("/")[0]
    allowed_hosts = [h for h in [frontend_host, backend_host] if h]
    if allowed_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# Rate limiter (Redis-backed)
app.add_middleware(RedisRateLimiter, redis_getter=get_redis)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Generate request ID, bind to logger context, return as header."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    structlog.contextvars.bind_contextvars(request_id=request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    structlog.contextvars.clear_contextvars()
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception",
                 path=request.url.path,
                 method=request.method,
                 error=str(exc),
                 exc_info=str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
        }
    )


@app.get("/health", tags=["System"])
async def health_check():
    components = {}

    db_status = await check_database_health()
    components["database"] = db_status

    try:
        r = await get_redis()
        await r.ping()
        components["redis"] = {"status": "healthy"}
    except Exception as e:
        components["redis"] = {"status": "degraded", "error": str(e)}

    llm_keys = []
    if settings.GEMINI_API_KEY:
        llm_keys.append("gemini")
    if settings.GROQ_API_KEY:
        llm_keys.append("groq")
    if settings.OPENROUTER_API_KEY:
        llm_keys.append("openrouter")
    components["llm"] = {
        "status": "healthy" if llm_keys else "degraded",
        "configured_providers": llm_keys or [],
    }

    overall = "healthy"
    for name, status in components.items():
        if status.get("status") == "degraded":
            overall = "degraded"

    return {
        "status": overall,
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
        "llm_provider": settings.LLM_PROVIDER,
        "components": components,
    }


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(converse.router, prefix="/api/converse", tags=["Converse"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"])
app.include_router(github.router, prefix="/api/github", tags=["GitHub"])