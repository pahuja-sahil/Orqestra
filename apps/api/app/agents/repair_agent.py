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
    
    prompt = f"""You are an expert API integration repair specialist. Your job is to fix broken integration code.

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

## YOUR TASK
1. Analyze the error and understand what went wrong
2. Determine the fix scope:
   - **minimal**: Just fix the specific line causing syntax error (1-5 lines)
   - **moderate**: Fix a section (function/method) that has issues (5-20 lines)
   - **complete**: Rewrite the entire integration if API changed significantly
3. Generate the fixed code that actually works
4. Ensure the code is syntactically correct and follows best practices

## OUTPUT FORMAT
Respond in this exact format:

## ANALYSIS
[Explain what went wrong and why]

## FIX SCOPE
minimal/moderate/complete

## FIXED CODE
```{language_lower}
[Your fixed code here - complete and working]
```

IMPORTANT:
- If this is a simple syntax error, fix it directly (minimal scope)
- If API changed, update accordingly (moderate or complete)
- Return COMPLETE working code, not just the fix
- Do not include any explanations outside the ANALYSIS section
- The code must be syntactically valid and runnable
"""
    
    try:
        logger.info("repair_agent_invoked", api=api_name, error_type=error_type)
        
        response = await get_llm_response(prompt)
        
        analysis_match = re.search(r"## ANALYSIS\s*\n(.*?)(?=## FIX SCOPE)", response, re.DOTALL | re.IGNORECASE)
        scope_match = re.search(r"## FIX SCOPE\s*\n(minimal|moderate|complete)", response, re.IGNORECASE)
        code_match = re.search(r"## FIXED CODE\s*```" + language_lower + r"\s*\n(.*?)```", response, re.DOTALL | re.IGNORECASE)
        
        if not code_match:
            code_match = re.search(r"## FIXED CODE\s*```.*?\n(.*?)```", response, re.DOTALL | re.IGNORECASE)
        
        analysis = analysis_match.group(1).strip() if analysis_match else "Analysis not provided"
        fix_scope = scope_match.group(1).lower() if scope_match else "complete"
        fixed_code = code_match.group(1).strip() if code_match else ""
        
        if not fixed_code:
            logger.error("repair_agent_no_code", api=api_name, response=response[:200])
            return {
                "success": False,
                "analysis": "Failed to extract code from LLM response",
                "fix_scope": "complete",
                "fixed_code": ""
            }
        
        fixed_code = fixed_code.strip()
        
        if language_lower == "python":
            try:
                compile(fixed_code, '<string>', 'exec')
                logger.info("repair_agent_code_valid", api=api_name, scope=fix_scope)
            except SyntaxError as se:
                logger.warning("repair_agent_syntax_invalid", api=api_name, error=str(se))
                return {
                    "success": False,
                    "analysis": f"Generated code has syntax error: {se}",
                    "fix_scope": fix_scope,
                    "fixed_code": ""
                }
        
        logger.info("repair_agent_success", api=api_name, scope=fix_scope, code_lines=len(fixed_code.split("\n")))
        
        return {
            "success": True,
            "analysis": analysis,
            "fix_scope": fix_scope,
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