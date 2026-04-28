from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from app.agents.state import NexusState
from app.core.config import settings
from app.core.logger import logger

gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.3
)

groq_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY,
    temperature=0.3
)


async def get_llm_response(prompt: str) -> str:
    """Try Gemini first, fall back to Groq on rate limit."""
    try:
        response = await gemini_llm.ainvoke(prompt)
        return response.content
    except Exception as e:
        if any(x in str(e) for x in ["429", "RESOURCE_EXHAUSTED", "quota"]):
            logger.warning("gemini_rate_limited_falling_back_to_groq")
            response = await groq_llm.ainvoke(prompt)
            return response.content
        raise

async def codegen_node(state: NexusState) -> NexusState:
    """
    Generates integration code based on plan and docs.
    On retry, uses evaluation_notes to improve.
    """
    retry = state.get("retry_count", 0)
    logger.info("codegen_node_start",
                api=state["api_name"],
                retry=retry)

    steps_text = "\n".join(
        f"{i+1}. {step}"
        for i, step in enumerate(state.get("integration_steps", []))
    )

    retry_context = ""
    if retry > 0 and state.get("evaluation_notes"):
        retry_context = f"""
PREVIOUS ATTEMPT FEEDBACK (attempt {retry}):
{state["evaluation_notes"]}

Previous code had these issues — analyze and fix ALL of them in this attempt.
"""

    if state["context"]:
        prompt = f"""You are NEXUS, an expert API integration engineer.

Integration Request: {state["user_input"]}
API: {state["api_name"]}
Goal: {state["integration_goal"]}
Language: {state["language"]}

Integration Steps:
{steps_text}

API Documentation:
{state["context"]}
{retry_context}
Generate complete, production-ready {state["language"]} code.

Requirements:
- Include all authentication setup
- Handle all error cases with try/except
- Add clear comments explaining each section
- Follow the integration steps exactly
- Make code immediately usable

Format response as:
## Integration Code

```{state["language"]}
[your code here]
```

## How It Works
[brief explanation of the code]

## Next Steps
[what the developer needs to do to use this code]"""

    else:
        prompt = f"""You are NEXUS, an intelligent API integration assistant.

User Question: {state["user_input"]}
{retry_context}
Provide a clear, detailed, developer-friendly response.
If this involves code, include working examples.
Be practical and actionable."""

    try:
        content = await get_llm_response(prompt)
        validated = await validate_agent_response(
            content,
            api_name=state.get("api_name", "")
        )
        state["generated_code"] = validated 
        logger.info("codegen_node_complete",
                    length=len(response.content),
                    retry=retry)

    except Exception as e:
        logger.error("codegen_node_failed", error=str(e))
        state["generated_code"] = f"I encountered an error generating the integration. Please try again. Error: {str(e)}"
        state["error"] = str(e)

    return state
