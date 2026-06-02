#!/usr/bin/env python3
"""
ORQESTRA Worker Entry Point
Runs health check loop every 5 minutes.
Repair jobs are dispatched via asyncio.create_task() — no ARQ dependency.
"""
import asyncio

from app.core.logger import setup_logging, logger
from app.core.database import AsyncSessionLocal
from app.core.circuit_breaker import get_redis
from app.core.task_utils import safe_create_task
from sqlalchemy import select
from app.models.integration import Integration


MAX_CONCURRENT_CHECKS = 5


async def health_check_loop():
    """Run health checks every 5 minutes — concurrent with semaphore limit (Issue #26)"""
    from workers.monitor import check_single_integration

    redis = await get_redis()
    logger.info("health_check_loop_started")

    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Integration).where(Integration.is_active == True)
                )
                integrations = result.scalars().all()
                logger.info("health_check_loop_run", count=len(integrations))

                sem = asyncio.Semaphore(MAX_CONCURRENT_CHECKS)

                async def checked(integration):
                    async with sem:
                        try:
                            await check_single_integration(integration, db)
                            await db.commit()
                        except Exception as e:
                            logger.error("health_check_loop_error", integration=integration.name, error=str(e))
                            await db.rollback()

                await asyncio.gather(*[checked(i) for i in integrations])

            logger.info("health_check_loop_complete")

        except Exception as e:
            logger.error("health_check_loop_critical_error", error=str(e))

        await asyncio.sleep(300)


async def main():
    """Start health check loop"""
    setup_logging()
    logger.info("worker_entrypoint_starting")

    health_check_task = safe_create_task(health_check_loop(), name="health_check_loop")

    try:
        await health_check_task
    except asyncio.CancelledError:
        logger.info("worker_shutting_down")
        health_check_task.cancel()


if __name__ == "__main__":
    asyncio.run(main())
