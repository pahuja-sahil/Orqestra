import asyncio
from app.core.logger import logger


def safe_create_task(coro, name: str = "") -> asyncio.Task:
    """
    Wraps asyncio.create_task with a done_callback that logs exceptions.
    Prevents silent failure loss (Issue #14).
    """
    task = asyncio.create_task(coro, name=name)

    def _log_exception(fut: asyncio.Task):
        if not fut.cancelled() and fut.exception() is not None:
            logger.error(
                "background_task_failed",
                task_name=name or fut.get_name(),
                error=str(fut.exception()),
                exc_info=str(fut.exception()),
            )

    task.add_done_callback(_log_exception)
    return task
