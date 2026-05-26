import json
import re
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from app.agents.state import OrqestraState
from app.core.config import settings
from app.core.logger import logger
from app.core.monitoring import track_llm_call

# OpenRouter (Llama 3.3 70B Free) - Architect
openrouter_llm = ChatOpenAI(
    model="meta-llama/llama-3.3-70b-instruct:free",
    api_key=settings.OPENROUTER_API_KEY or "none",
    base_url="https://openrouter.ai/api/v1",
    temperature=0.2
)

# Groq (Llama 3.3 70B Versatile) - Fallback
groq_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY or "none",
    temperature=0.2
)

async def get_planner_response(prompt: str) -> str:
    """Try OpenRouter first, fall back to Groq on any error."""
    if settings.OPENROUTER_API_KEY:
        try:
            response = await openrouter_llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.warning("planner_openrouter_unavailable_falling_back_to_groq", error=str(e)[:100])
    
    response = await groq_llm.ainvoke(prompt)
    return response.content

async def planner_node(state: OrqestraState) -> OrqestraState:
    """
    Analyzes user input and creates integration plan.
    Extracts API name, goal, steps, and language.
    """
    repo_url = (state.get("repo_url") or "").strip()
    logger.info("planner_node_start", input=state["user_input"][:50], repo_url=repo_url[:60] if repo_url else "EMPTY")

    prompt = f"""You are an expert API integration planner for ORQESTRA platform.

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
        content = await get_planner_response(prompt)
        track_llm_call(
            name="planner",
            model="llama-3.3-70b",
            prompt=prompt,
            response=content,
            metadata={"api_name": state.get("api_name", "")}
        )
        content = content.strip()

        # Robust JSON extraction
        json_match = re.search(r'(\{[\s\S]*\})', content)
        if json_match:
            content = json_match.group(1)
        
        plan = json.loads(content)

        api_name = plan.get("api_name", "general")
        if api_name.lower() == "general":
            state["api_name"] = "invalid"
            state["generated_code"] = "I am ORQESTRA, a specialized agent strictly designed to assist with API integrations, code generation, and platform monitoring/self-healing. I cannot answer general queries or engage in casual conversation."
        elif not repo_url:
            state["api_name"] = "invalid"
            state["generated_code"] = "I see you want to integrate an API. Please provide your GitHub repository URL using the 'Add repo' button above so I can analyze your codebase and prepare the integration PR."
        else:
            state["api_name"] = api_name
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