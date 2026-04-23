import json
from langchain_google_genai import ChatGoogleGenerativeAI
from app.agents.state import NexusState
from app.core.config import settings
from app.core.logger import logger

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.2
)


async def planner_node(state: NexusState) -> NexusState:
    """
    Analyzes user input and creates integration plan.
    Extracts API name, goal, steps, and language.
    """
    logger.info("planner_node_start", input=state["user_input"][:50])

    prompt = f"""You are an expert API integration planner for NEXUS platform.

Analyze this user request and extract a structured integration plan.

User Request: {state["user_input"]}

Return ONLY valid JSON with no markdown, no backticks, just raw JSON:
{{
  "api_name": "name of the API (e.g. Stripe, GitHub, Twilio)",
  "integration_goal": "one sentence describing what needs to happen",
  "integration_steps": ["step 1", "step 2", "step 3"],
  "language": "python or javascript (default python if unclear)"
}}

If this is not an API integration request, still return JSON:
{{
  "api_name": "general",
  "integration_goal": "answer the user question",
  "integration_steps": ["analyze question", "provide answer"],
  "language": "none"
}}"""

    try:
        response = await llm.ainvoke(prompt)
        content = response.content.strip()

        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        plan = json.loads(content)

        state["api_name"] = plan.get("api_name", "general")
        state["integration_goal"] = plan.get("integration_goal", state["user_input"])
        state["integration_steps"] = plan.get("integration_steps", [])
        state["language"] = plan.get("language", "python")

        logger.info("planner_node_complete",
                    api=state["api_name"],
                    steps=len(state["integration_steps"]))

    except Exception as e:
        logger.error("planner_node_failed", error=str(e))
        state["api_name"] = "general"
        state["integration_goal"] = state["user_input"]
        state["integration_steps"] = ["analyze request", "provide response"]
        state["language"] = "python"

    return state