# app/core/database.py
# ============================================
# DATABASE CONNECTION SETUP
# ============================================
# We use SQLAlchemy with ASYNC support
#
# WHY ASYNC DATABASE:
#   Synchronous: FastAPI WAITS for DB query
#                Server frozen, handles nothing else
#
#   Asynchronous: FastAPI sends DB query
#                 While waiting → handles 50 other requests
#                 DB responds → FastAPI resumes
#
# For an agent platform with long running tasks
# async is not optional — it's required
# ============================================

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
from app.core.logger import logger


def get_async_database_url() -> str:
    """
    Convert standard postgres URL to async version.
    asyncpg is the async PostgreSQL driver.
    
    postgresql://     → works with sync SQLAlchemy
    postgresql+asyncpg:// → works with async SQLAlchemy
    """
    url = settings.DATABASE_URL
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


# ----------------------------------------
# ENGINE
# The engine is the core connection to DB
# Think of it as the DB connection manager
# ----------------------------------------
engine = create_async_engine(
    get_async_database_url(),

    # Test connection health before using it
    # Prevents "connection already closed" errors
    # after the DB was idle for a long time
    pool_pre_ping=True,

    # Connection pool settings
    # Pool = a set of reusable DB connections
    # WHY: opening a new DB connection is expensive
    # Pool keeps connections ready to reuse
    pool_size=10,
    # Keep 10 connections ready at all times

    max_overflow=20,
    # Allow 20 extra connections during traffic spikes
    # Total max = pool_size + max_overflow = 30

    # Log every SQL query in development
    # NEVER in production — leaks sensitive data in logs
    echo=settings.ENVIRONMENT == "development",
)


# ----------------------------------------
# SESSION FACTORY
# Each request gets its own session
# Session = one unit of work with the database
# ----------------------------------------
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    # Can still access model attributes after commit
    # Without this → accessing data after commit = error
)


# ----------------------------------------
# BASE MODEL
# All database table classes inherit from this
# ----------------------------------------
class Base(DeclarativeBase):
    pass


# ----------------------------------------
# DATABASE DEPENDENCY
# FastAPI injects this into routes that need DB
#
# HOW IT WORKS:
#   Route declares: db: AsyncSession = Depends(get_db)
#   FastAPI calls get_db() automatically
#   Route gets fresh session
#   Session auto-closes when request ends
# ----------------------------------------
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            # ROLLBACK = undo all changes in this session
            # Prevents partial/corrupted data
            # Example: user created but password not saved
            # Rollback = neither gets saved. Clean state.
            logger.error("database_error", error=str(e))
            raise
        finally:
            await session.close()


# ----------------------------------------
# CONNECTION TEST
# Called at startup to verify DB is reachable
# ----------------------------------------
async def check_database_connection() -> bool:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(__import__('sqlalchemy').text("SELECT 1"))
            logger.info("database_connected")
            return True
    except Exception as e:
        logger.error("database_connection_failed", error=str(e))
        return False