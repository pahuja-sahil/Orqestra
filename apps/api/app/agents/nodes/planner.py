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
    Extracts API name, goal, steps, language, and target file.
    Uses conversation history for multi-turn context.
    """
    repo_url = (state.get("repo_url") or "").strip()
    history = state.get("conversation_history") or []
    logger.info("planner_node_start", input=state["user_input"][:50], repo_url=repo_url[:60] if repo_url else "EMPTY")

    # Build conversation history block
    history_block = ""
    has_code_in_history = False
    last_assistant_content = ""
    if history:
        formatted = []
        for entry in history[-6:]:
            role = entry.get("role", "user")
            text = entry.get("content", "")[:300]
            formatted.append(f"{role.capitalize()}: {text}")
            if role == "assistant" and "```" in (entry.get("content", "")):
                has_code_in_history = True
                last_assistant_content = entry.get("content", "")
        history_block = "Previous conversation:\n" + "\n".join(formatted) + "\n"

    repo_status = f"provided repo: {repo_url}" if repo_url else "NOT provided a GitHub repo URL yet."

    prompt = f"""You are ORQESTRA, an expert API integration planner. You are conversational, adaptive, and vary your language naturally — you never repeat the same phrases across turns.

{history_block}Current user request: {state["user_input"]}

Important: The user has {repo_status}
{"Note: The previous assistant response already generated code. If the user is now asking to create a PR, change the filename, or confirm — treat it as a follow_up. Do NOT generate new code." if has_code_in_history else ""}

Classify the user's intent:

**follow_up** — if:
- The agent just asked a question and the user is answering (yes/no, file choice, "create PR")
- Code was already generated and the user is now saying "create PR", "make a PR", "integrate in {{file}}", or choosing a file
- The user is NOT asking for new/different API integration code

**new_integration** — if the user:
- Is asking for a NEW API integration (even if they said "go ahead" or "proceed" with new details)
- Is providing additional integration details (checkout type, endpoint, etc.)
- Said "go ahead" followed by integration details — but NOT if it's just "create PR"

**general** — not API integration related

Response rules:
- If the user wants to integrate an API but has NOT provided a repo URL → ask for their GitHub repo URL. Do NOT give coding tutorials.
- If the user wants to integrate an API AND HAS a repo URL → acknowledge briefly, do NOT give guides
- If this is a follow_up wanting a PR → respond naturally like "Got it, creating the PR in {{file}} now"
- Be brief and natural. Vary your wording.

Return ONLY valid JSON with no markdown, no backticks:
{{
"intent_type": "new_integration" or "follow_up" or "general",
"api_name": "name of the API (e.g. Stripe, GitHub, Twilio) — empty for follow_up or general",
"integration_goal": "one sentence describing what needs to happen",
"integration_steps": ["step 1", "step 2", "step 3"],
"language": "python or javascript (default python if unclear)",
"target_file": "specific filename if user mentioned one (e.g., check.py, services/stripe.js), otherwise empty string. If user only said 'that file' or 'same file', use the target_file from the last assistant message.",
"response": "your natural response — ask for repo URL if missing, confirm if present. No tutorials. Vary your wording."
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

        json_match = re.search(r'(\{[\s\S]*\})', content)
        if json_match:
            content = json_match.group(1)

        plan = json.loads(content)

        intent_type = plan.get("intent_type", "new_integration")
        api_name = plan.get("api_name", "general")
        response_text = plan.get("response", "")

        if intent_type == "follow_up":
            state["skip_codegen"] = True
            state["generated_code"] = response_text or "Got it! I'll proceed with that."
            state["api_name"] = state.get("api_name") or "general"
            logger.info("planner_follow_up", response=response_text[:80])
        elif api_name.lower() == "general":
            state["skip_codegen"] = True
            state["api_name"] = "invalid"
            state["generated_code"] = response_text or "I am ORQESTRA, a specialized agent for API integrations. I can help you integrate APIs like Stripe, Twilio, SendGrid, and more into your project."
        elif not repo_url:
            state["skip_codegen"] = True
            state["api_name"] = "invalid"
            state["generated_code"] = response_text or "I see you want to integrate an API. Please provide your GitHub repository URL so I can analyze your codebase and prepare the integration."
        else:
            state["api_name"] = api_name
            state["integration_goal"] = plan.get("integration_goal", state["user_input"])
            state["integration_steps"] = plan.get("integration_steps", [])
            state["language"] = plan.get("language", "python")
            state["target_file"] = plan.get("target_file", "")
            state["skip_codegen"] = False

        logger.info("planner_node_complete",
                    api=state["api_name"],
                    intent=intent_type,
                    skip=state.get("skip_codegen", False))

    except Exception as e:
        logger.error("planner_node_failed", error=str(e))
        state["api_name"] = "general"
        state["integration_goal"] = state["user_input"]
        state["integration_steps"] = ["analyze request", "provide response"]
        state["language"] = "python"

    return state