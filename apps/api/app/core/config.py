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
from typing import Optional


class Settings(BaseSettings):

    # ----------------------------------------
    # APPLICATION
    # ----------------------------------------
    ENVIRONMENT: str = "development"
    SECRET_KEY: str
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
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

    # ----------------------------------------
    # AUTH
    # ----------------------------------------
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    NEXTAUTH_SECRET: str
    NEXTAUTH_URL: str = "http://localhost:3000"
    NEXT_PUBLIC_API_URL: str = "http://localhost/api"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ----------------------------------------
    # LLM — Free providers
    # ----------------------------------------
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"

    # Active LLM provider — easy to switch
    LLM_PROVIDER: str = "gemini"
    # Options: "gemini" | "groq"
    # Change this one value to switch entire app

    # ----------------------------------------
    # MONITORING
    # ----------------------------------------
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # ----------------------------------------
    # EMAIL
    # ----------------------------------------
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "nexus@resend.dev"

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