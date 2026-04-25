import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from arq import cron
from app.core.database import AsyncSessionLocal
from app.models.integration import Integration
from app.models.user import User
from app.core.circuit_breaker import record_failure, record_success, CircuitState
from app.services.notification_service import send_integration_broken
from app.core.logger import logger


async def check_integration_health(integration: Integration) -> bool:
    """
    Simulates checking if an integration is healthy.
    In production: makes actual API call to test the integration.
    """
    import random
    return random.random() > 0.2


async def monitor_integrations(ctx):
    """
    ARQ worker task — runs every 5 minutes.
    Checks health of all active integrations.
    """
    logger.info("monitor_worker_start")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Integration).where(Integration.is_active == True)
        )
        integrations = result.scalars().all()

        logger.info("monitoring_integrations", count=len(integrations))

        for integration in integrations:
            try:
                is_healthy = await check_integration_health(integration)
                integration.last_checked = datetime.now(timezone.utc)

                if is_healthy:
                    if integration.status != "healthy":
                        integration.status = "healthy"
                        integration.failure_count = 0
                        await record_success(str(integration.id))
                        logger.info("integration_healthy",
                                    name=integration.name)
                else:
                    integration.failure_count += 1
                    circuit_state = await record_failure(str(integration.id))

                    if circuit_state == CircuitState.OPEN:
                        integration.status = "broken"
                        integration.circuit_state = "open"

                        user_result = await db.execute(
                            select(User).where(User.id == integration.user_id)
                        )
                        user = user_result.scalar_one_or_none()

                        if user:
                            await send_integration_broken(
                                user_email=user.email,
                                user_name=user.name,
                                integration_name=integration.name,
                                api_name=integration.api_name
                            )

                        await ctx["redis"].enqueue_job(
                            "repair_integration",
                            str(integration.id)
                        )
                        logger.warning("integration_broken_queued_repair",
                                       name=integration.name)

                await db.commit()

            except Exception as e:
                logger.error("monitor_check_failed",
                             integration=integration.name,
                             error=str(e))

    logger.info("monitor_worker_complete")