from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logger import setup_logging, logger
from app.core.database import check_database_connection
from app.routers import auth
from app.routers import converse
from app.routers import integrations

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
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"])