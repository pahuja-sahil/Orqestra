from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from app.agents.state import OrqestraState
from app.core.config import settings
from app.core.logger import logger
from app.services.guardrails_service import validate_agent_response
from app.core.monitoring import track_llm_call
import asyncio

# OpenRouter (Llama 3.3 70B Free)
openrouter_llm = ChatOpenAI(
    model="meta-llama/llama-3.3-70b-instruct:free",
    api_key=settings.OPENROUTER_API_KEY or "none",
    base_url="https://openrouter.ai/api/v1",
    temperature=0.3,
    max_retries=0
)

# Groq (Llama 3.3 70B Versatile)
groq_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY or "none",
    temperature=0.3,
    max_retries=0
)

# Gemini (fallback)
gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=settings.GEMINI_API_KEY or "none",
    temperature=0.3,
    max_retries=0
)


async def get_llm_response(prompt: str) -> str:
    """Try multiple LLM providers with exponential backoff on rate limits."""
    providers = []
    
    if settings.GEMINI_API_KEY:
        providers.append(("gemini", gemini_llm))
    if settings.OPENROUTER_API_KEY:
        providers.append(("openrouter", openrouter_llm))
    if settings.GROQ_API_KEY:
        providers.append(("groq", groq_llm))
    
    if not providers:
        raise Exception("No LLM API keys configured")
    
    last_error = None
    for provider_name, llm in providers:
        for attempt in range(3):
            try:
                if attempt > 0:
                    wait_time = min(2 ** attempt, 30)
                    logger.info(f"retry_{provider_name}_attempt_{attempt + 1}", wait=wait_time)
                    await asyncio.sleep(wait_time)
                
                response = await llm.ainvoke(prompt)
                logger.info(f"llm_success_{provider_name}")
                return response.content
            except Exception as e:
                error_str = str(e)
                last_error = e
                is_rate_limit = "429" in error_str or "rate_limit" in error_str.lower()
                
                logger.warning(f"llm_error_{provider_name}", 
                               attempt=attempt + 1, 
                               error=error_str[:100],
                               rate_limit=is_rate_limit)
                
                if not is_rate_limit and attempt >= 2:
                    break
                    
                if attempt < 2:
                    continue
    
    raise Exception(f"All LLM providers failed. Last error: {last_error}")


async def codegen_node(state: OrqestraState) -> OrqestraState:
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

    integration_type = state.get("integration_type") or "new"
    retry_context = ""
    if retry > 0 and state.get("evaluation_notes"):
        notes_lower = state["evaluation_notes"].lower()
        has_existing_code_note = "existing" in notes_lower and ("unnecessary" in notes_lower or "unrelated" in notes_lower or "not part of" in notes_lower or "irrelevant" in notes_lower)

        if integration_type == "new" and has_existing_code_note:
            extra_instructions = """
CRITICAL: Some evaluation notes mentioned existing code. This is expected.
- Only improve the NEW integration code you added.
- Ignore evaluator feedback about existing code — it must stay.
"""
        elif integration_type == "update":
            api_name = state.get("api_name", "API")
            extra_instructions = f"""
CRITICAL: This is an UPDATE. Address the evaluator's feedback about the new code.
- Replace the old {api_name} integration patterns with new ones.
- Do NOT duplicate old {api_name} code — only the new version should remain.
- Keep OTHER integrations untouched.
"""
        else:
            extra_instructions = """
  - Address EVERY issue listed above
  - Do not repeat the same mistakes
"""

        retry_context = f"""
PREVIOUS ATTEMPT {retry} FAILED:
  Score: {state.get("quality_score", 0)}/10
  Issues identified: {state["evaluation_notes"]}

INSTRUCTIONS FOR THIS ATTEMPT:
{extra_instructions}
  - Be more thorough with error handling
  - Ensure all authentication is complete
  - Double check against the integration steps
"""

    try:
        # Now build prompt — both branches always define prompt
        if state["context"]:
            pr_ask = ""
            if state.get("repo_url"):
                pr_ask = "## Ready for PR\nI have analyzed your repository and prepared the integration. Are you ready for me to create the Pull Request? If you allow it, please click the **Create PR in repo** button below."
            else:
                pr_ask = "## Next Steps\n[what the developer needs to do to use this code]"

            # Surgical repair vs New integration vs Update
            is_repair = state.get("source") == "repair"
            if is_repair:
                error_reason = state.get("error_reason", "")
                existing_content = state.get("existing_file_content", "")

                import re
                line_match = re.search(r"line (\d+)", error_reason)
                line_num = int(line_match.group(1)) if line_match else None

                if line_num and existing_content:
                    lines = existing_content.split("\n")
                    start = max(0, line_num - 5)
                    end = min(len(lines), line_num + 5)
                    broken_snippet = "\n".join(lines[start:end])

                    instruction_block = f"""
CRITICAL INSTRUCTION (HOLE-FILLING REPAIR):
- The code at line {line_num} is broken: {error_reason}.
- I have provided a 10-line window around the error below.
- YOUR TASK: Fix the error and return ONLY the corrected 10-line block.
- DO NOT return the whole file.
- DO NOT change any other lines.
- MATCH THE EXACT INDENTATION of the original lines.
- If the fix requires fewer than 5 lines, return just those lines.
- If the fix is bigger (missing try/except, new imports, new functions), return moderate scope.
"""
                    repo_section = f"""
BROKEN CODE WINDOW (Lines {start+1} to {end}):
```python
{broken_snippet}
```
{instruction_block}
"""
                else:
                    instruction_block = f"""
CRITICAL INSTRUCTION (SURGICAL REPAIR):
- Analyze the error: {error_reason}
- Determine fix scope:
  * minimal (1-5 lines): syntax typo, missing comma, wrong param → fix exact lines only
  * moderate (5-30 lines): missing try/except, wrong API call → fix section
  * complete (full file): major restructuring, new imports → return full file
- RETURN ONLY THE MINIMAL CHANGES needed. Do not rewrite working code.
- If the error is minor (typo, syntax), return just the fixed line(s).
"""
                    repo_section = f"""
EXISTING CODE:
```python
{existing_content[:8000]}
```
{instruction_block}
"""
            elif integration_type == "update":
                existing_content = state.get("existing_file_content", "")
                instruction_block = f"""
CRITICAL INSTRUCTION (UPDATE INTEGRATION):
- REPLACE the old {state.get("api_name", "API")} integration code with the new version.
- The old {state.get("api_name", "API")} code is in the file below — rewrite only that section.
- Keep ALL other integrations and code EXACTLY as they are.
- Do NOT duplicate old {state.get("api_name", "API")} code — only the new version should remain.
- Update imports and auth if the new API version requires it.
"""
                repo_section = f"""
REPOSITORY CONTEXT:
{state["repo_context"]}

EXISTING FILE CONTENT (target: {state.get("target_file", "integrations.py")}):
```python
{existing_content[:4000]}
```
{instruction_block}
"""
            else:
                # New Integration (default)
                is_new_file = not state.get("existing_file_content", "")

                if is_new_file:
                    instruction_block = f"""
CRITICAL INSTRUCTION (NEW FILE):
- Create a NEW file at {state.get("target_file", "")} with ONLY the {state.get("api_name", "API")} integration code.
- Do NOT include code from other files or APIs in the repository.
- Follow the user's request exactly — generate only what was asked.
"""
                    repo_section = f"""
REPOSITORY CONTEXT (for reference only):
{state["repo_context"]}
"""
                else:
                    instruction_block = f"""
CRITICAL INSTRUCTION (APPEND TO EXISTING FILE):
- Add your new {state.get("api_name", "API")} integration code to the existing file.
- Keep ALL existing code and functions exactly as they are.
- Output the COMPLETE file including existing content plus your new additions.
"""
                    repo_section = f"""
REPOSITORY CONTEXT:
{state["repo_context"]}

EXISTING FILE CONTENT (target: {state.get("target_file", "integrations.py")}):
```python
{state.get("existing_file_content", "")[:4000]}
```
{instruction_block}
"""

            requirements_block = ""
            if not is_repair:
                requirements_block = """
Requirements:
- Include all authentication setup
- Handle all error cases with try/except
- Add clear comments explaining each section
- Follow the integration steps exactly
- Make code immediately usable
"""

            prompt = f"""You are ORQESTRA, an expert API integration engineer.

Integration Request: {state["user_input"]}
API: {state["api_name"]}
Goal: {state["integration_goal"]}
Language: {state["language"]}

API Documentation:
{state["context"]}
{repo_section}
{retry_context}

{requirements_block}

Format response as:
## Integration Code

```{state["language"]}
[your fixed code block here]
```

## How It Works
[brief explanation of the fix]

{pr_ask}"""

        else:
            prompt = f"""You are ORQESTRA, an intelligent API integration assistant.

User Question: {state["user_input"]}
{retry_context}
Provide a clear, detailed, developer-friendly response.
If this involves code, include working examples.
Be practical and actionable."""

        content = await get_llm_response(prompt)

        track_llm_call(
            name="codegen",
            model="openrouter-free-gemini",
            prompt=prompt,
            response=content,
            metadata={
                "api_name": state.get("api_name", ""),
                "retry": retry
            }
        )

        validated = await validate_agent_response(
            content,
            api_name=state.get("api_name", "")
        )
        state["generated_code"] = validated
        logger.info("codegen_node_complete",
                    length=len(validated),
                    retry=retry)

    except Exception as e:
        logger.error("codegen_node_failed", error=str(e))
        state["generated_code"] = "I encountered an issue generating the integration. Please try again."
        state["error"] = str(e)

    return state