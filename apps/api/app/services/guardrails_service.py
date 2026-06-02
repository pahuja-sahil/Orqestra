import re
import json
import ast
from app.core.logger import logger


class IntegrationOutputValidator:
    """
    Validates CodeGen agent output before sending to user.
    Checks structure, safety and completeness.
    No external Guardrails library needed —
    custom validation tailored to ORQESTRA output format.
    """

    REQUIRED_SECTIONS = [
        "Integration Code",
        "How It Works",
    ]

    DANGEROUS_PATTERNS = [
        r"rm\s+-rf",
        r"DROP\s+TABLE",
        r"DELETE\s+FROM",
        r"os\.system",
        r"subprocess\.call",
        r"__import__",
        r"eval\(",
        r"exec\(",
    ]

    FORBIDDEN_IMPORTS = [
        "subprocess", "shutil",
        "socket", "ctypes", "multiprocessing", "threading",
    ]

    FORBIDDEN_BUILTINS = [
        "exec", "eval", "__import__", "compile",
        "globals", "locals", "open",
    ]

    MIN_CODE_LENGTH = 50
    MAX_RESPONSE_LENGTH = 15000

    def _ast_scan(self, code: str, issues: list, api_name: str):
        """AST-level analysis — catches obfuscated dangerous calls that regex misses."""
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in self.FORBIDDEN_IMPORTS:
                        msg = f"Dangerous import detected (AST): {alias.name}"
                        issues.append(msg)
                        logger.warning("guardrails_ast_import", module=alias.name, api=api_name)

            if isinstance(node, ast.ImportFrom):
                if node.module in self.FORBIDDEN_IMPORTS:
                    msg = f"Dangerous import detected (AST): {node.module}"
                    issues.append(msg)
                    logger.warning("guardrails_ast_import", module=node.module, api=api_name)

            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in self.FORBIDDEN_BUILTINS:
                        msg = f"Dangerous call detected (AST): {node.func.id}"
                        issues.append(msg)
                        logger.warning("guardrails_ast_call", call=node.func.id, api=api_name)
                if isinstance(node.func, ast.Attribute):
                    if isinstance(node.func.value, ast.Attribute) and \
                       isinstance(node.func.value.value, ast.Attribute):
                        # obj.__class__.__bases__ bypass pattern
                        if "__class__" in str(node.func.value.value.attr) or \
                           "__bases__" in str(node.func.value.attr) or \
                           "__subclasses__" in str(node.func.attr):
                            msg = "Dangerous introspection pattern detected (AST)"
                            issues.append(msg)
                            logger.warning("guardrails_ast_introspection", api=api_name)

    def validate(self, response: str, api_name: str = "") -> dict:
        """
        Validates agent response.
        Returns: is_valid, issues, cleaned_response
        """
        issues = []

        if not response or len(response.strip()) < self.MIN_CODE_LENGTH:
            issues.append("Response too short or empty")
            return {
                "is_valid": False,
                "issues": issues,
                "cleaned_response": response,
                "score": 0
            }

        if len(response) > self.MAX_RESPONSE_LENGTH:
            response = response[:self.MAX_RESPONSE_LENGTH]
            issues.append("Response truncated — too long")

        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, response, re.IGNORECASE):
                issues.append(f"Dangerous pattern detected: {pattern}")
                logger.warning("guardrails_dangerous_pattern",
                               pattern=pattern, api=api_name)

        # AST-level analysis on code blocks
        code_blocks = re.findall(r"```(?:\w+)?\n(.*?)```", response, re.DOTALL)
        for block in code_blocks:
            self._ast_scan(block, issues, api_name)

        has_code = "```" in response
        if not has_code:
            issues.append("No code block found in response")

        score = 10
        score -= len(issues) * 2
        score = max(0, min(10, score))

        is_valid = score >= 5 and not any(
            "Dangerous" in i for i in issues
        )

        if not is_valid:
            logger.warning("guardrails_validation_failed",
                           issues=issues, api=api_name, score=score)
        else:
            logger.info("guardrails_validation_passed",
                        score=score, api=api_name)

        return {
            "is_valid": is_valid,
            "issues": issues,
            "cleaned_response": response,
            "score": score
        }

    def get_fallback_response(self, api_name: str, error: str) -> str:
        return f"""
## Unable to Generate Integration

ORQESTRA encountered an issue generating the {api_name} integration.

**Reason:** {error}

**What you can do:**
1. Try rephrasing your request with more specific details
2. Specify the programming language you need
3. Mention specific endpoints or features you want

**Example:** "Integrate Stripe payment intents API in Python 
              with webhook support and error handling"
"""


validator = IntegrationOutputValidator()


async def validate_agent_response(
    response: str,
    api_name: str = ""
) -> str:
    """
    Main entry point — validates response and returns
    cleaned version or fallback if invalid.
    """
    try:
        result = validator.validate(response, api_name)

        if result["is_valid"]:
            return result["cleaned_response"]
        else:
            dangerous = any(
                "Dangerous" in i for i in result["issues"]
            )
            if dangerous:
                logger.error("guardrails_blocked_dangerous",
                             api=api_name)
                return validator.get_fallback_response(
                    api_name,
                    "Security validation failed"
                )
            return result["cleaned_response"]

    except Exception as e:
        logger.error("guardrails_error", error=str(e))
        return response