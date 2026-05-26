#!/usr/bin/env python3
"""
ORQESTRA Worker Entry Point
Runs health check loop for monitoring and repair job handling
"""
import asyncio

from app.core.logger import setup_logging, logger
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.integration import Integration


async def health_check_loop():
    """Run health checks every 10 minutes - includes triggering repair if needed"""
    from workers.monitor import check_single_integration
    from app.core.redis import get_redis
    
    logger.info("health_check_loop_started")
    
    while True:
        try:
            redis = await get_redis()
            
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Integration).where(Integration.is_active == True)
                )
                integrations = result.scalars().all()
                logger.info("health_check_loop_run", count=len(integrations))
                
                for integration in integrations:
                    try:
                        ctx = {"redis": redis}
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
    """Start health check loop"""
    setup_logging()
    
    logger.info("worker_entrypoint_starting")
    
    health_check_task = asyncio.create_task(health_check_loop())
    
    try:
        await health_check_task
    except asyncio.CancelledError:
        logger.info("worker_shutting_down")
        health_check_task.cancel()


if __name__ == "__main__":
    asyncio.run(main())