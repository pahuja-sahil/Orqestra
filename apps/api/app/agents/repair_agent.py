import re
import ast
from typing import Optional
from app.core.config import settings
from app.core.logger import logger


async def repair_integration_code(
    api_name: str,
    error_type: str,
    error_message: str,
    current_code: str,
    api_docs_context: str,
    language: str = "python",
    repo_context: str = ""
) -> dict:
    """
    Single LLM call to repair integration code.
    
    Args:
        api_name: Name of the API (e.g., "razorpay", "stripe")
        error_type: Type of error ("syntax_error", "api_change", "docs_drift", "health_check")
        error_message: The specific error message
        current_code: The current broken code
        api_docs_context: Relevant API docs from RAG
        language: Programming language (python, javascript)
        repo_context: Context about the repository structure
    
    Returns:
        dict with keys: analysis, fix_scope, fixed_code, success
    """
    from app.agents.nodes.codegen import get_llm_response
    
    language_lower = language.lower()
    
    # Scale the repair scope based on error type
    if error_type == "docs_drift":
        scope_rule = f"""
## RULES (API UPDATE)
1. The API docs have changed — update the affected {api_name} code to match.
2. You MAY rewrite entire functions if the new API requires different signatures.
3. Keep OTHER integrations and helper code unchanged.
4. Remove OLD deprecated patterns — do not keep both old and new versions.
5. Update imports and auth if the new API version requires it.
"""
    elif error_type == "syntax_error":
        scope_rule = """
## RULES (SYNTAX FIX — MINIMAL CHANGE)
1. Change ONLY the specific line(s) causing the syntax error.
2. Keep EVERY other line EXACTLY IDENTICAL.
3. Do NOT add, remove, or reorder any line that was not part of the error.
4. Do NOT reformat, rename variables, add comments, or "improve" anything.
"""
    else:
        scope_rule = """
## RULES (TARGETED REPAIR)
1. Fix the reported issue with minimal changes.
2. Keep other code untouched.
3. Do not reformat or restructure working code.
"""

    prompt = f"""You are a precise code repair specialist.

## CONTEXT
- API Name: {api_name}
- Language: {language_lower}
- Error Type: {error_type}
- Error Message: {error_message}

## CURRENT BROKEN CODE
```{language_lower}
{current_code}
```

## REPOSITORY CONTEXT
{repo_context}

## API DOCUMENTATION CONTEXT
{api_docs_context}

{scope_rule}

## OUTPUT FORMAT
```{language_lower}
[fixed code — with the issue corrected per the scope rules above]
```
"""
    
    try:
        logger.info("repair_agent_invoked", api=api_name, error_type=error_type)
        
        response = await get_llm_response(prompt)
        
        code_match = re.search(r"```" + language_lower + r"\s*\n(.*?)```", response, re.DOTALL | re.IGNORECASE)
        if not code_match:
            code_match = re.search(r"```.*?\n(.*?)```", response, re.DOTALL | re.IGNORECASE)
        
        fixed_code = code_match.group(1).strip() if code_match else ""
        
        if not fixed_code:
            logger.error("repair_agent_no_code", api=api_name, response=response[:200])
            return {
                "success": False,
                "fixed_code": "",
                "error": "Failed to extract code from LLM response"
            }
        
        # For syntax errors, verify minimal change
        if error_type == "syntax_error" and fixed_code:
            orig_lines = current_code.strip().split("\n")
            fix_lines = fixed_code.split("\n")
            if len(orig_lines) == len(fix_lines):
                changed = sum(1 for a, b in zip(orig_lines, fix_lines) if a != b)
                if changed > 3:
                    logger.warning("repair_agent_too_many_changes", api=api_name, changed=changed)
        
        if language_lower == "python":
            try:
                compile(fixed_code, '<string>', 'exec')
                logger.info("repair_agent_code_valid", api=api_name, code_lines=len(fixed_code.split("\n")))
            except SyntaxError as se:
                logger.warning("repair_agent_syntax_invalid", api=api_name, error=str(se))
                return {
                    "success": False,
                    "fixed_code": "",
                    "error": f"Generated code has syntax error: {se}"
                }
        
        logger.info("repair_agent_success", api=api_name, code_lines=len(fixed_code.split("\n")))

        # Quality gate: run evaluator on the fix
        try:
            from app.agents.nodes.evaluator import evaluator_node, should_retry
            from app.agents.state import OrqestraState

            eval_state: OrqestraState = {
                "user_input": f"Fix {api_name} integration: {error_message}",
                "source": "repair",
                "conversation_history": [],
                "api_name": api_name,
                "integration_goal": f"Repair {api_name} integration ({error_type})",
                "integration_steps": [],
                "language": language_lower,
                "skip_codegen": False,
                "integration_type": "repair",
                "retrieved_docs": [],
                "context": api_docs_context,
                "repo_url": "",
                "repo_context": repo_context,
                "target_file": "",
                "default_branch": "main",
                "repo_path": "",
                "existing_file_content": current_code,
                "user_id": "",
                "db": None,
                "docs_url": None,
                "generated_code": fixed_code,
                "code_explanation": "",
                "quality_score": 0,
                "evaluation_notes": "",
                "retry_count": 0,
                "final_response": "",
                "error": None,
                "error_reason": None,
                "repair_intent": None,
                "fix_scope": None,
            }

            eval_result = await evaluator_node(eval_state)
            eval_score = eval_result.get("quality_score", 0)
            eval_notes = eval_result.get("evaluation_notes", "")

            if eval_score < 7:
                logger.warning("repair_agent_eval_low_score",
                               api=api_name,
                               score=eval_score,
                               notes=eval_notes[:100])
            else:
                logger.info("repair_agent_eval_passed",
                            api=api_name,
                            score=eval_score)
        except Exception as eval_err:
            logger.warning("repair_agent_eval_skipped",
                           api=api_name,
                           error=str(eval_err)[:100])

        return {
            "success": True,
            "fixed_code": fixed_code
        }
        
    except Exception as e:
        logger.error("repair_agent_failed", api=api_name, error=str(e))
        return {
            "success": False,
            "analysis": f"Repair failed: {str(e)}",
            "fix_scope": "complete",
            "fixed_code": ""
        }


def is_trivial_syntax_error(error_message: str) -> bool:
    """
    Check if this is a trivial syntax error that can be auto-fixed without LLM.
    
    Returns True if it's a simple syntax issue we can fix directly.
    """
    trivial_patterns = [
        r"invalid syntax.*line \d+",
        r"expected.*found",
        r"missing.*parentheses",
        r"unexpected.*indent",
        r"unindent.*doesn't match",
        r"E.*\d+",
    ]
    
    error_lower = error_message.lower()
    for pattern in trivial_patterns:
        if re.search(pattern, error_lower):
            return True
    
    return False


def auto_fix_syntax(code: str, error_message: str, language: str = "python") -> Optional[str]:
    """
    Try to auto-fix trivial syntax errors without LLM.
    
    Returns fixed code if successful, None otherwise.
    """
    if language.lower() != "python":
        return None
    
    try:
        import ast
        
        lines = code.split("\n")
        
        line_num_match = re.search(r"line (\d+)", error_message)
        if not line_num_match:
            return None
            
        error_line_idx = int(line_num_match.group(1)) - 1
        
        if error_line_idx < 0 or error_line_idx >= len(lines):
            return None
        
        error_line = lines[error_line_idx]
        
        if "expected" in error_message.lower() and ":" in error_line:
            if not error_line.strip().endswith(":"):
                lines[error_line_idx] = error_line + ":"
                return "\n".join(lines)
        
        if "invalid syntax" in error_message.lower():
            fixed_lines = []
            for i, line in enumerate(lines):
                if i == error_line_idx:
                    stripped = line.rstrip()
                    if stripped and not stripped.startswith("#"):
                        if not any(stripped.endswith(c) for c in [":", ",", "(", "[", "{", "\\"]):
                            if "=" in stripped and "==" not in stripped:
                                if not any(stripped.endswith(c) for c in ["+", "-", "*", "/", "%"]):
                                    pass
                fixed_lines.append(line)
            
            return "\n".join(fixed_lines)
        
        return None
        
    except Exception as e:
        logger.warning("auto_fix_failed", error=str(e))
        return None