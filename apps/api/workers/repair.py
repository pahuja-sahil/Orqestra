"""
ORQESTRA Repair Worker
Handles self-healing of broken integrations.
Dispatched via asyncio.create_task() — no ARQ dependency.
"""

import asyncio
import re
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.models.integration import Integration
from app.models.user import User
from app.agents.repair_agent import (
    repair_integration_code,
    is_trivial_syntax_error,
    auto_fix_syntax
)
from app.services.notification_service import (
    send_integration_fixed,
    send_integration_failed_repair
)
from app.services.vector_service import get_relevant_docs


MAX_REPAIR_ATTEMPTS = 4
BACKOFF_TIMES = [60, 120, 240, 480]


async def check_code_already_fixed(integration: Integration, db: AsyncSession) -> bool:
    """Check if the code on GitHub is already valid (user fixed it)."""
    if not integration.repo_url or not integration.file_path:
        return False
    try:
        from app.services.github_service import get_github_client
        github_client, _ = await get_github_client(str(integration.user_id), db)
        repo_parts = integration.repo_url.replace("https://github.com/", "").split("/")
        if len(repo_parts) < 2:
            return False
        owner, repo = repo_parts[0], repo_parts[1]
        gh_repo = github_client.get_repo(f"{owner}/{repo}")
        content = gh_repo.get_contents(integration.file_path, ref=integration.default_branch or "main")
        code = content.decoded_content.decode("utf-8")
        if integration.language and integration.language.lower() == "python":
            try:
                compile(code, '<string>', 'exec')
                return True
            except SyntaxError:
                return False
        return True
    except Exception:
        return False


async def repair_integration_direct(integration_id: str):
    """
    Direct repair handler — called via asyncio.create_task().
    Manages retries with backoff internally.
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

        attempt = integration.repair_attempts
        logger.info("repair_attempt", name=integration.name, attempt=attempt)

        if attempt > 1:
            wait_time = BACKOFF_TIMES[min(attempt - 2, len(BACKOFF_TIMES) - 1)]
            logger.info("repair_backoff", wait_seconds=wait_time, attempt=attempt)
            await asyncio.sleep(wait_time)

        # Check if code is already fixed (user merged PR or fixed manually)
        code_already_fixed = await check_code_already_fixed(integration, db)
        if code_already_fixed:
            logger.info("repair_skipped_code_already_fixed", name=integration.name)
            integration.status = "healthy"
            integration.failure_count = 0
            await db.commit()
            return

        try:
            result = await attempt_repair(integration, db)

            if result["success"]:
                await handle_successful_repair(integration, result["fixed_code"], user, db)
            else:
                await handle_failed_repair(integration, result["error"], user, attempt, db)

        except Exception as e:
            logger.error("repair_unexpected_error", name=integration.name, error=str(e))
            await handle_failed_repair(integration, str(e), user, attempt, db)


async def attempt_repair(integration: Integration, db: AsyncSession) -> dict:
    """Attempt to repair the integration"""

    error_type = "health_check"
    error_message = integration.health_check or "Unknown error"

    if "SyntaxError" in error_message:
        if is_trivial_syntax_error(error_message):
            logger.info("attempting_auto_fix_syntax", name=integration.name)
            fixed = auto_fix_syntax(
                integration.generated_code or "",
                error_message,
                integration.language or "python"
            )
            if fixed:
                return {
                    "success": True,
                    "fixed_code": fixed,
                    "auto_fixed": True
                }
        error_type = "syntax_error"

    if "Docs:" in error_message:
        error_type = "docs_drift"
        logger.info("docs_drift_repair", name=integration.name)

    docs_context = integration.cached_docs_context or ""
    needs_fresh_docs = not docs_context or "||" not in docs_context or len(docs_context) < 100

    if needs_fresh_docs:
        logger.info("fetching_fresh_docs_for_repair", name=integration.name, reason="no_cached_docs" if not docs_context else "stale_cache")
        docs_context = await get_relevant_docs(integration.api_name, top_k=5)
        integration.cached_docs_context = docs_context

    repo_context = ""
    if integration.repo_url and integration.file_path:
        try:
            from app.services.github_service import get_github_client
            github_client, _ = await get_github_client(str(integration.user_id), db)
            repo_parts = integration.repo_url.replace("https://github.com/", "").split("/")
            if len(repo_parts) >= 2:
                owner, repo = repo_parts[0], repo_parts[1]
                gh_repo = github_client.get_repo(f"{owner}/{repo}")
                content = gh_repo.get_contents(integration.file_path, ref=integration.default_branch or "main")
                code = content.decoded_content.decode("utf-8")
                repo_context = f"File: {integration.file_path}\nCurrent code:\n{code[:2000]}"
        except Exception as e:
            logger.warning("repo_context_fetch_failed", error=str(e))

    result = await repair_integration_code(
        api_name=integration.api_name,
        error_type=error_type,
        error_message=error_message,
        current_code=integration.generated_code or "",
        api_docs_context=docs_context,
        language=integration.language or "python",
        repo_context=repo_context
    )

    return result


async def handle_successful_repair(integration: Integration, fixed_code: str, user: User, db: AsyncSession):
    """Handle successful repair - update DB, create PR, notify user"""

    integration.generated_code = fixed_code
    integration.status = "pr_pending"
    integration.failure_count = 0
    integration.last_repaired = datetime.now(timezone.utc)

    if user:
        try:
            await send_integration_fixed(
                user_email=user.email,
                user_name=user.name,
                integration_name=integration.name,
                api_name=integration.api_name
            )
            logger.info("repair_success_email_sent", name=integration.name)
        except Exception as e:
            logger.warning("email_failed", error=str(e))

    if integration.repo_path and integration.file_path and integration.default_branch:
        try:
            from app.services.github_service import create_integration_pr
            pr_result = await create_integration_pr(
                repo_path=integration.repo_path,
                api_name=integration.api_name,
                target_file=integration.file_path,
                generated_code=fixed_code,
                default_branch=integration.default_branch,
                user_id=str(user.id),
                db=db
            )
            logger.info("repair_pr_created", name=integration.name, pr_url=pr_result.get("pr_url"))
        except Exception as e:
            logger.error("repair_pr_failed", name=integration.name, error=str(e))

    await db.commit()
    logger.info("repair_completed_success", name=integration.name)


async def handle_failed_repair(integration: Integration, error: str, user: User, attempt: int, db: AsyncSession):
    """Handle failed repair attempt"""

    logger.warning("repair_attempt_failed", name=integration.name, attempt=attempt, error=error[:100])

    if attempt >= MAX_REPAIR_ATTEMPTS:
        integration.status = "failed"
        await db.commit()

        if user:
            try:
                await send_integration_failed_repair(
                    user_email=user.email,
                    user_name=user.name,
                    integration_name=integration.name,
                    api_name=integration.api_name
                )
            except Exception as e:
                logger.warning("failure_email_failed", error=str(e))

        logger.error("repair_failed_permanently", name=integration.name, attempts=attempt)
    else:
        integration.status = "healing"
        await db.commit()

        asyncio.create_task(repair_integration_direct(str(integration.id)))
        logger.info("repair_retry_scheduled", name=integration.name, next_attempt=attempt + 1)
