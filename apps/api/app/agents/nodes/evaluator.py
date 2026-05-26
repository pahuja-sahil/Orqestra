import json
import re
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from app.agents.state import OrqestraState
from app.core.config import settings
from app.core.logger import logger
from app.core.monitoring import track_llm_call

QUALITY_THRESHOLD = 7
MAX_RETRIES = 3

# OpenRouter (Llama 3.3 70B Free) - Judge
openrouter_llm = ChatOpenAI(
    model="meta-llama/llama-3.3-70b-instruct:free",
    api_key=settings.OPENROUTER_API_KEY or "none",
    base_url="https://openrouter.ai/api/v1",
    temperature=0.1
)

# Groq (Llama 3.3 70B Versatile) - Fallback
groq_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY or "none",
    temperature=0.1
)

async def get_evaluator_response(prompt: str) -> str:
    """Try OpenRouter first, fall back to Groq."""
    if settings.OPENROUTER_API_KEY:
        try:
            response = await openrouter_llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.warning("evaluator_openrouter_unavailable_falling_back_to_groq", error=str(e)[:100])
    
    response = await groq_llm.ainvoke(prompt)
    return response.content

async def evaluator_node(state: OrqestraState) -> OrqestraState:
    """
    Scores the generated code/response.
    """
    logger.info("evaluator_node_start",
                retry=state.get("retry_count", 0))

    if state.get("error"):
        state["quality_score"] = 0
        state["evaluation_notes"] = "Error occurred during generation"
        return state

    prompt = f"""You are a senior code reviewer evaluating an API integration response.

Original Request: {state["user_input"]}
API: {state["api_name"]}
Goal: {state["integration_goal"]}

Generated Response:
{state["generated_code"]}

Evaluate on these criteria:
1. Completeness — does it fully address the request?
2. Authentication — is auth properly handled?
3. Error handling — are errors caught and handled?
4. Code quality — is it clean and well-commented?
5. Accuracy — is the API usage correct based on the request?

Return ONLY this format:
SCORE: [number 1-10]
NOTES: [specific issues to fix, or "Excellent" if score >= 8]"""

    try:
        content = await get_evaluator_response(prompt)
        track_llm_call(
            name="evaluator",
            model="llama-3.3-70b",
            prompt=prompt,
            response=content,
            metadata={
                "api_name": state.get("api_name", ""),
                "score": state.get("quality_score", 0)
            }
        )
        content = content.strip()

        score_match = re.search(r"SCORE:\s*(\d+)", content)
        notes_match = re.search(r"NOTES:\s*(.+)", content, re.DOTALL)

        score = int(score_match.group(1)) if score_match else 7
        notes = notes_match.group(1).strip() if notes_match else "No specific feedback"

        score = max(1, min(10, score))

        state["quality_score"] = score
        state["evaluation_notes"] = notes
        state["retry_count"] = state.get("retry_count", 0)

        logger.info("evaluator_node_complete",
                    score=score,
                    retry=state["retry_count"],
                    notes=notes[:80])

    except Exception as e:
        logger.error("evaluator_node_failed", error=str(e))
        state["quality_score"] = 7
        state["evaluation_notes"] = "Evaluation failed, using default score"

    return state


def should_retry(state: OrqestraState) -> str:
    score = state.get("quality_score", 7)
    retries = state.get("retry_count", 0)
    error = state.get("error", "")

    # Stop retry on ANY error — prevents infinite loops
    if error:
        logger.warning("skipping_retry_due_to_error",
                       error=str(error)[:80])
        return "end"

    if score < QUALITY_THRESHOLD and retries < MAX_RETRIES:
        state["retry_count"] = retries + 1
        logger.info("retrying_generation",
                    score=score,
                    attempt=state["retry_count"])
        return "retry"

    logger.info("evaluation_passed",
                score=score,
                total_attempts=retries + 1)
    return "end"