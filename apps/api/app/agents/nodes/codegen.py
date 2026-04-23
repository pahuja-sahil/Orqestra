from langchain_google_genai import ChatGoogleGenerativeAI
from app.agents.state import NexusState
from app.core.config import settings
from app.core.logger import logger

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.3
)


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
        response = await llm.ainvoke(prompt)
        state["generated_code"] = response.content
        logger.info("codegen_node_complete",
                    length=len(response.content),
                    retry=retry)

    except Exception as e:
        logger.error("codegen_node_failed", error=str(e))
        state["generated_code"] = f"I encountered an error generating the integration. Please try again. Error: {str(e)}"
        state["error"] = str(e)

    return state