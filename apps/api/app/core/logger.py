# app/core/logger.py
# ============================================
# STRUCTURED LOGGING SETUP
# ============================================
# Plain text logs (bad):
#   "User 123 login failed at 2024-01-01 02:14:33"
#   ❌ Can't search by user_id
#   ❌ Can't filter by event type
#   ❌ Can't set alerts on specific patterns
#
# Structured logs (good):
#   {
#     "event": "login_failed",
#     "user_id": "123",
#     "reason": "invalid_otp",
#     "timestamp": "2024-01-01T02:14:33Z",
#     "level": "warning"
#   }
#   ✅ Search: show all login_failed events
#   ✅ Filter: show failures for user 123
#   ✅ Alert: if login_failed > 10/min → notify
# ============================================

import structlog
import logging
from app.core.config import settings


def setup_logging() -> None:
    """
    Configure structured logging for the application.
    Call this ONCE at application startup.
    """

    log_level = (
        logging.DEBUG
        if settings.ENVIRONMENT == "development"
        else logging.INFO
        # DEBUG → log everything (noisy but useful in dev)
        # INFO  → log important events only (production)
    )

    structlog.configure(
        processors=[
            # Add log level to every entry
            structlog.stdlib.add_log_level,

            # Add logger name (which file logged this)
            structlog.stdlib.add_logger_name,

            # Add ISO timestamp
            structlog.processors.TimeStamper(fmt="iso"),

            # Add exception info if present
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,

            # Development: colored readable output
            # Production: JSON for log aggregation tools
            (
                structlog.dev.ConsoleRenderer()
                if settings.ENVIRONMENT == "development"
                else structlog.processors.JSONRenderer()
            ),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        log_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(message)s",
        level=log_level,
    )


# ----------------------------------------
# LOGGER INSTANCE
# Import this single logger everywhere
#
# Usage in any file:
#   from app.core.logger import logger
#   logger.info("user_created", user_id="123", email="x@y.com")
#   logger.error("payment_failed", error=str(e), amount=500)
#   logger.warning("rate_limit_approaching", count=90)
# ----------------------------------------
logger = structlog.get_logger("nexus")