import asyncio
import logging
from arq.connections import RedisSettings
from arq.worker import Worker
from app.core.config import settings
from app.core.logger import logger
from workers.monitor import check_single_integration
from workers.repair import repair_integration
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.integration import Integration


from arq import create_pool

class WorkerSettings:
    functions = [repair_integration]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 10
    job_timeout = 900


async def run_health_checks_loop():
    """Run health checks every 10 minutes - independent of arq cron"""
    logger.info("health_check_loop_started")
    
    # Create redis connection pool to inject into ctx
    redis_pool = await create_pool(WorkerSettings.redis_settings)
    ctx = {"redis": redis_pool}
    
    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Integration).where(Integration.is_active == True)
                )
                integrations = result.scalars().all()
                logger.info("health_check_loop_run", count=len(integrations))
                
                for integration in integrations:
                    try:
                        await check_single_integration(integration, db, ctx)
                        await db.commit()
                    except Exception as e:
                        logger.error("health_check_loop_error", integration=integration.name, error=str(e))
                        await db.rollback()
            
            logger.info("health_check_loop_complete")
            
        except Exception as e:
            logger.error("health_check_loop_critical_error", error=str(e))
        
        await asyncio.sleep(600)


async def main():
    """Start both arq worker and health check loop"""
    from app.core.logger import setup_logging
    setup_logging()
    
    logger.info("starting_worker_with_health_check_loop")
    
    loop = asyncio.get_event_loop()
    
    health_check_task = loop.create_task(run_health_checks_loop())
    
    worker = Worker(
        WorkerSettings.functions,
        cron_jobs=WorkerSettings.cron_jobs,
        redis_settings=WorkerSettings.redis_settings,
        max_jobs=WorkerSettings.max_jobs,
        job_timeout=WorkerSettings.job_timeout,
    )
    
    await worker.async_init()
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())