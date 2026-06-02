# app/core/config.py
# ============================================
# SINGLE SOURCE OF TRUTH FOR ALL CONFIG
# ============================================
# Pydantic Settings does two things:
#   1. Reads values from .env file automatically
#   2. Validates types — if DATABASE_URL is missing
#      the app CRASHES at startup with a clear error
#
# WHY crash at startup?
#   Better to fail immediately with clear message
#   than run for hours with wrong config silently
# ============================================

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):

    # ----------------------------------------
    # APPLICATION
    # ----------------------------------------
    ENVIRONMENT: str = "development"
    SECRET_KEY: str
    BACKEND_URL: str = "http://localhost"
    FRONTEND_URL: str = "http://localhost"
    JINA_API_KEY: str = ""

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_min_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters (got {len(v)})"
            )
        return v

    # Comma-separated list of allowed CORS origins
    ALLOWED_ORIGINS: str = ""

    # Behind proxy flag enables Secure cookie flag
    BEHIND_PROXY: bool = False

    # Encryption key for sensitive fields (e.g. GitHub tokens)
    # If empty, derived from SECRET_KEY
    ENCRYPTION_KEY: str = ""

    # ChromaDB connection mode: "persistent" (local) or "http" (server)
    CHROMA_MODE: str = "persistent"
    # ChromaDB HTTP host (only used when CHROMA_MODE=http)
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000

    # No default = REQUIRED
    # Missing = app won't start

    # ----------------------------------------
    # DATABASE
    # ----------------------------------------
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    # ----------------------------------------
    # REDIS
    # ----------------------------------------
    REDIS_URL: str = "redis://localhost:6379"
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_GENERAL: str = "60/minute"
    RATE_LIMIT_AUTH: str = "5/minute"

    # ----------------------------------------
    # AUTH
    # ----------------------------------------
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    NEXTAUTH_SECRET: str
    NEXTAUTH_URL: str = "http://localhost:3000"
    NEXT_PUBLIC_API_URL: str = "http://localhost/api"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # ----------------------------------------
    # LLM — Free providers
    # ----------------------------------------
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    DEEPGRAM_VOICE_MODEL: str = "aura-asteria-en"

    # Active LLM provider — easy to switch
    LLM_PROVIDER: str = "gemini"
    # Options: "gemini" | "groq"
    # Change this one value to switch entire app

    # ----------------------------------------
    # MONITORING
    # ----------------------------------------
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # ----------------------------------------
    # EMAIL
    # ----------------------------------------
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "orqestra@resend.dev"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"
        # DATABASE_URL ≠ database_url
        # Prevents subtle bugs from case mismatches


# Singleton pattern
# One instance imported everywhere
# Never create Settings() again anywhere else
settings = Settings()