from langfuse import Langfuse
from app.core.config import settings
from app.core.logger import logger

langfuse_client = None
_langfuse_failure_count = 0


def get_langfuse():
    """
    Returns Langfuse client.
    Lazy initialization — only connects when first used.
    """
    global langfuse_client
    if langfuse_client is None:
        if not settings.LANGFUSE_PUBLIC_KEY:
            return None

        try:
            langfuse_client = Langfuse(
                public_key=settings.LANGFUSE_PUBLIC_KEY,
                secret_key=settings.LANGFUSE_SECRET_KEY,
                host=settings.LANGFUSE_HOST
            )
            logger.info("langfuse_connected")
        except Exception as e:
            logger.warning("langfuse_unavailable", error=str(e))
            return None
    return langfuse_client


def track_llm_call(
    name: str,
    model: str,
    prompt: str,
    response: str,
    trace_id: str = None,
    metadata: dict = {}
):
    """
    Tracks a single LLM call in Langfuse.
    """
    global _langfuse_failure_count
    try:
        lf = get_langfuse()
        if not lf:
            return

        lf.generation(
            name=f"{name}_generation",
            model=model,
            input=prompt[:2000],
            output=response[:2000],
            metadata=metadata
        )
        lf.flush()

    except Exception as e:
        _langfuse_failure_count += 1
        logger.warning(
            "langfuse_tracking_failed",
            error=str(e),
            total_failures=_langfuse_failure_count,
        )


def track_agent_run(
    user_input: str,
    api_name: str,
    final_response: str,
    quality_score: int,
    retry_count: int,
    source: str = "text"
) -> str:
    """
    Tracks a full agent pipeline run in Langfuse.
    """
    global _langfuse_failure_count
    try:
        lf = get_langfuse()
        if not lf:
            return None

        lf.generation(
            name="orqestra_agent_run",
            input=user_input[:500],
            output=final_response[:500],
            metadata={
                "api_name": api_name,
                "quality_score": quality_score,
                "retry_count": retry_count,
                "source": source
            }
        )
        lf.flush()
        return None

    except Exception as e:
        _langfuse_failure_count += 1
        logger.warning(
            "langfuse_agent_tracking_failed",
            error=str(e),
            total_failures=_langfuse_failure_count,
        )
        return None