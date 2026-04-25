from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.integration import Integration
from app.models.user import User
from app.agents.nexus_agent import run_nexus_agent
from app.core.circuit_breaker import record_success
from app.services.notification_service import (
    send_integration_fixed,
    send_integration_failed_repair
)
from app.core.logger import logger

MAX_REPAIR_ATTEMPTS = 3


async def repair_integration(ctx, integration_id: str):
    """
    ARQ worker task — triggered when integration breaks.
    Attempts to automatically repair using AI agents.
    """
    logger.info("repair_worker_start", integration_id=integration_id)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Integration).where(Integration.id == integration_id)
        )
        integration = result.scalar_one_or_none()

        if not integration:
            logger.error("integration_not_found", id=integration_id)
            return

        user_result = await db.execute(
            select(User).where(User.id == integration.user_id)
        )
        user = user_result.scalar_one_or_none()

        integration.status = "healing"
        integration.repair_attempts += 1
        await db.commit()

        logger.info("attempting_repair",
                    name=integration.name,
                    attempt=integration.repair_attempts)

        try:
            repair_prompt = f"""
            Fix this broken {integration.api_name} integration.
            Integration name: {integration.name}
            Description: {integration.description}
            Current code that needs fixing:
            {integration.generated_code or "No existing code"}
            
            Generate a complete, working replacement.
            """

            new_code = await run_nexus_agent(
                repair_prompt,
                source="repair"
            )

            integration.generated_code = new_code
            integration.status = "healthy"
            integration.failure_count = 0
            integration.circuit_state = "closed"
            integration.last_repaired = datetime.now(timezone.utc)
            await db.commit()

            await record_success(integration_id)

            if user:
                await send_integration_fixed(
                    user_email=user.email,
                    user_name=user.name,
                    integration_name=integration.name,
                    api_name=integration.api_name
                )

            logger.info("repair_successful", name=integration.name)

        except Exception as e:
            logger.error("repair_failed",
                         name=integration.name,
                         error=str(e))

            if integration.repair_attempts >= MAX_REPAIR_ATTEMPTS:
                integration.status = "failed"
                await db.commit()

                if user:
                    await send_integration_failed_repair(
                        user_email=user.email,
                        user_name=user.name,
                        integration_name=integration.name,
                        api_name=integration.api_name
                    )

                logger.error("repair_escalated", name=integration.name)
            else:
                integration.status = "broken"
                await db.commit()

                await ctx["redis"].enqueue_job(
                    "repair_integration",
                    integration_id
                )