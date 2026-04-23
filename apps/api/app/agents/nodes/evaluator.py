import re
from langchain_google_genai import ChatGoogleGenerativeAI
from app.agents.state import NexusState
from app.core.config import settings
from app.core.logger import logger

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.1
)

QUALITY_THRESHOLD = 7
MAX_RETRIES = 3


async def evaluator_node(state: NexusState) -> NexusState:
    """
    Scores the generated code/response.
    Provides specific feedback for retry if score < threshold.
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
        response = await llm.ainvoke(prompt)
        content = response.content.strip()

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


def should_retry(state: NexusState) -> str:
    """
    Decision function for conditional edge.
    Returns "retry" or "end"
    """
    score = state.get("quality_score", 7)
    retries = state.get("retry_count", 0)

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