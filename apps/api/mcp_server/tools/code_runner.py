import ast
import sys
from io import StringIO
from fastmcp import FastMCP
from app.core.logger import logger

FORBIDDEN_IMPORTS = [
    "os", "sys", "subprocess", "shutil",
    "socket", "pathlib", "glob", "tempfile",
    "multiprocessing", "threading", "ctypes"
]

FORBIDDEN_CALLS = [
    "exec", "eval", "__import__", "open",
    "compile", "globals", "locals", "vars",
    "getattr", "setattr", "delattr"
]


def is_code_safe(code: str) -> tuple[bool, str]:
    """
    Static analysis of code before execution.
    Checks for forbidden imports and dangerous calls.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error: {e}"

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name in FORBIDDEN_IMPORTS:
                    return False, f"Forbidden import: {alias.name}"

        if isinstance(node, ast.ImportFrom):
            if node.module in FORBIDDEN_IMPORTS:
                return False, f"Forbidden import: {node.module}"

        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in FORBIDDEN_CALLS:
                    return False, f"Forbidden call: {node.func.id}"

    return True, "Safe"


def register_code_runner(mcp: FastMCP):

    @mcp.tool()
    async def validate_python_code(code: str) -> dict:
        """
        Validates Python code for safety and syntax.
        Does NOT execute — only static analysis.
        Returns: valid, safe, issues found
        """
        is_safe, reason = is_code_safe(code)

        try:
            ast.parse(code)
            syntax_valid = True
        except SyntaxError as e:
            syntax_valid = False
            reason = str(e)

        return {
            "syntax_valid": syntax_valid,
            "is_safe": is_safe,
            "reason": reason,
            "can_execute": syntax_valid and is_safe
        }

    @mcp.tool()
    async def run_python_sandbox(
        code: str,
        timeout_seconds: int = 10
    ) -> dict:
        """
        Runs Python code in a restricted sandbox.
        Only safe code passes the static analysis check.
        Captures stdout and stderr.
        """
        is_safe, reason = is_code_safe(code)

        if not is_safe:
            logger.warning("sandbox_blocked", reason=reason)
            return {
                "success": False,
                "output": "",
                "error": f"Code blocked: {reason}"
            }

        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = StringIO()
        sys.stderr = StringIO()

        try:
            safe_globals = {
                "__builtins__": {
                    "print": print,
                    "len": len,
                    "range": range,
                    "str": str,
                    "int": int,
                    "float": float,
                    "list": list,
                    "dict": dict,
                    "bool": bool,
                    "type": type,
                    "isinstance": isinstance,
                    "enumerate": enumerate,
                    "zip": zip,
                    "map": map,
                    "filter": filter,
                    "sorted": sorted,
                    "sum": sum,
                    "min": min,
                    "max": max,
                }
            }

            exec(code, safe_globals)
            output = sys.stdout.getvalue()
            error = sys.stderr.getvalue()

            logger.info("sandbox_executed", output_len=len(output))
            return {
                "success": True,
                "output": output[:2000],
                "error": error[:500] if error else None
            }

        except Exception as e:
            logger.error("sandbox_error", error=str(e))
            return {
                "success": False,
                "output": sys.stdout.getvalue(),
                "error": str(e)
            }
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr