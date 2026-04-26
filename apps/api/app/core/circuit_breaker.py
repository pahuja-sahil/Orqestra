import json
import redis.asyncio as aioredis
from enum import Enum
from app.core.config import settings
from app.core.logger import logger


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


FAILURE_THRESHOLD = 3
RECOVERY_TIMEOUT = 600
redis_client = None


async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return redis_client


async def get_circuit_state(integration_id: str) -> CircuitState:
    try:
        r = await get_redis()
        state = await r.get(f"circuit:{integration_id}:state")
        return CircuitState(state) if state else CircuitState.CLOSED
    except Exception as e:
        logger.error("circuit_breaker_error", error=str(e))
        return CircuitState.CLOSED


async def record_failure(integration_id: str) -> CircuitState:
    try:
        r = await get_redis()
        key = f"circuit:{integration_id}:failures"
        failures = await r.incr(key)
        await r.expire(key, 300)

        if failures >= FAILURE_THRESHOLD:
            await r.setex(
                f"circuit:{integration_id}:state",
                RECOVERY_TIMEOUT,
                CircuitState.OPEN
            )
            logger.warning("circuit_opened",
                           integration=integration_id,
                           failures=failures)
            return CircuitState.OPEN

        return CircuitState.CLOSED
    except Exception as e:
        logger.error("circuit_failure_error", error=str(e))
        return CircuitState.CLOSED


async def record_success(integration_id: str):
    try:
        r = await get_redis()
        await r.delete(f"circuit:{integration_id}:failures")
        await r.delete(f"circuit:{integration_id}:state")
        logger.info("circuit_closed", integration=integration_id)
    except Exception as e:
        logger.error("circuit_success_error", error=str(e))