import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.core.config import settings
from app.core.logger import logger


class RedisRateLimiter(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter backed by Redis.
    Falls back to pass-through if Redis is unavailable.
    """

    def __init__(self, app, redis_getter):
        super().__init__(app)
        self.get_redis = redis_getter

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path

        # No rate limiting on auth endpoints (login, logout, OAuth, refresh, 2FA, me)
        if path.startswith("/api/auth/"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"

        limit = 60
        window = 60

        try:
            redis = await self.get_redis()
            if redis:
                key = f"ratelimit:{client_ip}:{path.split('/')[2] if len(path.split('/')) > 2 else 'general'}"
                now = time.time()
                window_start = now - window

                await redis.zremrangebyscore(key, 0, window_start)
                count = await redis.zcard(key)

                if count >= limit:
                    logger.warning("rate_limit_exceeded", ip=client_ip, path=path)
                    return JSONResponse(
                        status_code=429,
                        content={
                            "error": "Too many requests",
                            "detail": f"Rate limit of {limit} requests per {window}s exceeded",
                        },
                    )

                await redis.zadd(key, {str(now): now})
                await redis.expire(key, window)
        except Exception:
            pass

        return await call_next(request)
