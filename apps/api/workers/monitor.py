"""
ORQESTRA Integration Monitor
Runs every 5 minutes to check integration health
"""

import asyncio
import hashlib
from datetime import datetime, timezone
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.models.integration import Integration
from app.models.user import User
from app.services.notification_service import send_integration_broken


API_HEALTH_ENDPOINTS = {
    "stripe": "https://api.stripe.com/v1/balance",
    "github": "https://api.github.com/rate_limit",
    "twilio": "https://api.twilio.com/2010-04-01/Accounts",
    "sendgrid": "https://api.sendgrid.com/v3/scopes",
    "slack": "https://slack.com/api/api.test",
    "openai": "https://api.openai.com/v1/models",
    "razorpay": "https://api.razorpay.com/v1",
}

API_DOCS_ENDPOINTS = {
    "stripe": "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json",
    "github": "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json",
    "twilio": "https://raw.githubusercontent.com/twilio/twilio-oai/main/spec/yaml/twilio_api_v2010.yaml",
    "openai": "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    "razorpay": "https://raw.githubusercontent.com/razorpay/api-collection/master/razorpay.json",
}


async def check_http_health(integration: Integration) -> tuple[bool, str]:
    """Check if API endpoint is responding"""
    api_name = integration.api_name.lower().strip()
    
    endpoint = next(
        (url for key, url in API_HEALTH_ENDPOINTS.items() if key in api_name),
        None
    )
    
    if not endpoint and integration.health_check_url:
        endpoint = integration.health_check_url
    
    if not endpoint:
        return True, "No health endpoint configured"
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(endpoint)
            expected = integration.expected_health_status
            if expected is not None:
                # If we know what status to expect, a change means regression
                healthy = response.status_code == expected
            else:
                # First-time check: 200 and 401/403 are normal for unauthenticated hits
                healthy = response.status_code in [200, 401, 403]
                if healthy:
                    integration.expected_health_status = response.status_code
            return healthy, f"HTTP {response.status_code}"
    except Exception as e:
        return False, str(e)


async def extract_api_endpoints(docs_content: str, api_name: str) -> set:
    """Extract API endpoints from docs content"""
    endpoints = set()
    
    try:
        import json
        docs = json.loads(docs_content)
        
        if "paths" in docs:
            for path, methods in docs["paths"].items():
                if isinstance(methods, dict):
                    for method in methods.keys():
                        if method.lower() not in ["get", "post", "put", "delete", "patch"]:
                            continue
                        endpoints.add(f"{method.upper()} {path}")
        
        if "servers" in docs:
            servers = docs.get("servers", [])
            if isinstance(servers, list) and servers:
                base_url = servers[0].get("url", "") if isinstance(servers[0], dict) else str(servers[0])
                logger.info("docs_api_base_url", api=api_name, base_url=base_url)
        
    except json.JSONDecodeError:
        import re
        paths = re.findall(r'["\']?/(?:[a-zA-Z0-9{}:_/-]+)["\']?\s*:', docs_content)
        for p in paths:
            endpoints.add(p.strip().strip('"').strip("'"))
    
    return endpoints


async def check_docs_drift(integration: Integration) -> tuple[bool, str, str]:
    """Check if API docs have changed and detect breaking changes"""
    api_name = integration.api_name.lower().strip()
    
    docs_url = integration.docs_url or next(
        (url for key, url in API_DOCS_ENDPOINTS.items() if key in api_name),
        None
    )
    
    if not docs_url:
        # Try dynamic discovery if no URL known yet
        try:
            from app.services.discovery_service import discover_api
            discovered = await discover_api(api_name)
            if discovered.get("docs_url"):
                integration.docs_url = discovered["docs_url"]
                docs_url = discovered["docs_url"]
                logger.info("docs_url_discovered", api=api_name, url=docs_url)
        except Exception:
            pass
    
    if not docs_url:
        logger.info("docs_check_skip_no_url", api=api_name)
        return False, "", integration.docs_hash or ""
    
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            response = await client.get(docs_url)
            if response.status_code != 200:
                logger.warning("docs_check_http_error", api=api_name, status=response.status_code)
                return False, "", integration.docs_hash or ""
            
            content = response.text[:200_000]
            new_hash = hashlib.sha256(content.encode()).hexdigest()
            
            stored_hash = integration.docs_hash or ""
            
            if not integration.docs_hash:
                integration.docs_hash = new_hash
                logger.info("docs_hash_initialized", api=api_name, hash=new_hash[:16])
                return False, "", new_hash
            
            if new_hash != stored_hash:
                logger.warning("docs_drift_detected", api=api_name, old_hash=stored_hash[:12], new_hash=new_hash[:12])
                
                old_endpoints = set()
                if integration.cached_docs_context:
                    try:
                        old_endpoints = set(integration.cached_docs_context.split("||")[0].split(","))
                    except:
                        pass
                
                new_endpoints = await extract_api_endpoints(content, api_name)
                
                added_endpoints = new_endpoints - old_endpoints
                if added_endpoints:
                    logger.info("docs_new_endpoints", api=api_name, count=len(added_endpoints), endpoints=list(added_endpoints)[:5])
                
                docs_summary = f"{new_hash[:16]}|{len(new_endpoints)} endpoints"
                return True, docs_summary, new_hash
            
            logger.info("docs_unchanged", api=api_name)
            return False, "", new_hash
            
    except Exception as e:
        logger.warning("docs_check_failed", api=api_name, error=str(e))
        return False, "", integration.docs_hash or ""


async def check_code_health(integration: Integration, db: AsyncSession) -> tuple[bool, str]:
    """Check code syntax and runtime by fetching from GitHub"""
    logger.info("code_health_check_start", name=integration.name, repo_url=integration.repo_url, file_path=integration.file_path, language=integration.language)
    
    if not integration.repo_url or not integration.file_path:
        logger.info("code_health_skip_no_repo", name=integration.name)
        return True, "No repo configured"
    
    try:
        from app.services.github_service import get_github_client
        
        repo_parts = integration.repo_url.replace("https://github.com/", "").split("/")
        if len(repo_parts) < 2:
            logger.warning("code_health_invalid_repo", name=integration.name, repo_url=integration.repo_url)
            return True, "Invalid repo URL"
        
        owner, repo = repo_parts[0], repo_parts[1]
        logger.info("code_health_fetching", name=integration.name, owner=owner, repo=repo, branch=integration.default_branch or "main")
        
        github_client, _ = await get_github_client(str(integration.user_id), db)
        
        repo_obj = github_client.get_repo(f"{owner}/{repo}")
        content = repo_obj.get_contents(integration.file_path, ref=integration.default_branch or "main")
        code = content.decoded_content.decode("utf-8")
        logger.info("code_health_fetched", name=integration.name, code_len=len(code))
        
        if integration.language and integration.language.lower() == "python":
            try:
                compile(code, '<string>', 'exec')
                logger.info("code_health_syntax_ok", name=integration.name)
            except SyntaxError as e:
                logger.warning("code_health_syntax_error", name=integration.name, error=str(e))
                return False, f"SyntaxError: {str(e)}"
            
            try:
                import ast
                import io
                import sys
                tree = ast.parse(code)
                function_names = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
                logger.info("code_health_functions_found", name=integration.name, functions=function_names)
                
                # Capture stderr to detect deprecation warnings
                old_stderr = sys.stderr
                sys.stderr = io.StringIO()
                try:
                    exec(compile(code, '<string>', 'exec'), {'__name__': f'{integration.api_name}_test'})
                    stderr_output = sys.stderr.getvalue()
                finally:
                    sys.stderr = old_stderr
                
                if stderr_output and ("DeprecationWarning" in stderr_output or "FutureWarning" in stderr_output or "PendingDeprecationWarning" in stderr_output):
                    logger.warning("code_health_deprecation", name=integration.name, warnings=stderr_output[:300])
                    integration.deprecation_warnings = stderr_output[:2000]
                
                logger.info("code_health_runtime_ok", name=integration.name)
                return True, "Syntax and runtime OK"
            except NameError as e:
                logger.warning("code_health_name_error", name=integration.name, error=str(e))
                return False, f"NameError: {str(e)}"
            except ImportError as e:
                logger.warning("code_health_import_error", name=integration.name, error=str(e))
                failed_import = str(e).lower()
                api_name = (integration.api_name or "").lower().strip()
                # If the failed import IS this integration's own SDK, it's a real failure
                if api_name and api_name in failed_import:
                    return False, f"ImportError: {e}"
                return True, f"Import skipped (not in sandbox): {str(e)}"
            except AttributeError as e:
                logger.warning("code_health_attribute_error", name=integration.name, error=str(e))
                return False, f"AttributeError: {str(e)}"
            except Exception as e:
                logger.warning("code_health_runtime_error", name=integration.name, error=str(e), error_type=type(e).__name__)
                return False, f"RuntimeError: {str(e)}"
        
        logger.info("code_health_skip_non_python", name=integration.name, language=integration.language)
        return True, "Syntax check skipped for non-Python"
        
    except Exception as e:
        logger.error("code_health_failed", name=integration.name, error=str(e), error_type=type(e).__name__)
        return False, f"Code check failed: {str(e)}"





async def check_single_integration(integration: Integration, db: AsyncSession):
    """Check a single integration and trigger repair if needed"""
    from workers.repair import repair_integration_direct, MAX_REPAIR_ATTEMPTS

    integration.last_checked = datetime.now(timezone.utc)
    
    logger.info("checking_integration", name=integration.name, status=integration.status, failure_count=integration.failure_count, repo_url=integration.repo_url)

    # ── PR pending: check if PR was merged (code on main branch fixed) ──
    if integration.status == "pr_pending":
        code_ok, code_msg = await check_code_health(integration, db)
        if code_ok:
            integration.status = "healthy"
            integration.failure_count = 0
            logger.info("pr_merged_integration_healthy", name=integration.name)
        else:
            logger.info("pr_not_merged_yet", name=integration.name, msg=code_msg)
        return

    if integration.status == "healing":
        code_ok, code_msg = await check_code_health(integration, db)
        if code_ok:
            integration.status = "healthy"
            integration.failure_count = 0
            integration.repair_attempts = 0
            logger.info("healing_code_already_fixed", name=integration.name)
            return

        if integration.repair_attempts >= MAX_REPAIR_ATTEMPTS:
            integration.status = "broken"
            logger.info("healing_exhausted_marking_broken", name=integration.name, attempts=integration.repair_attempts)
            return

        logger.info("healing_still_in_progress", name=integration.name, attempts=integration.repair_attempts)
        return

    elif integration.status == "broken":
        logger.info("integration_already_broken", name=integration.name)
        return

    is_healthy = True
    error_details = []
    
    http_ok, http_msg = await check_http_health(integration)
    logger.info("http_check_result", name=integration.name, ok=http_ok, msg=http_msg)
    if not http_ok:
        is_healthy = False
        error_details.append(f"HTTP: {http_msg}")
    
    docs_drifted, docs_summary, new_docs_hash = await check_docs_drift(integration)
    if docs_drifted:
        integration.docs_hash = new_docs_hash
        existing_context = integration.cached_docs_context or ""
        if "||" in existing_context:
            old_content = existing_context.split("||")[-1]
            integration.cached_docs_context = f"{docs_summary}||{old_content}"
        else:
            integration.cached_docs_context = docs_summary
        logger.warning("docs_drift_marking_unhealthy", name=integration.name, summary=docs_summary)
        is_healthy = False
        error_details.append(f"Docs: API updated - {docs_summary}")
    
    code_ok, code_msg = await check_code_health(integration, db)
    logger.info("code_check_result", name=integration.name, ok=code_ok, msg=code_msg)
    if not code_ok:
        is_healthy = False
        error_details.append(f"Code: {code_msg}")
    
    logger.info("integration_health_summary", name=integration.name, is_healthy=is_healthy, error_details=error_details)
    
    if not is_healthy:
        integration.failure_count += 1
        error_msg = "; ".join(error_details)
        integration.health_check = error_msg
        
        logger.warning(
            "integration_unhealthy",
            name=integration.name,
            failures=integration.failure_count,
            errors=error_msg
        )
        
        should_repair = integration.failure_count >= 2
        
        if should_repair:
            integration.status = "healing"
            
            user_result = await db.execute(
                select(User).where(User.id == integration.user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if user:
                try:
                    await send_integration_broken(
                        user_email=user.email,
                        user_name=user.name,
                        integration_name=integration.name,
                        api_name=integration.api_name
                    )
                except Exception as e:
                    logger.warning("notification_failed", error=str(e))
            
            asyncio.create_task(repair_integration_direct(str(integration.id)))
            logger.warning("repair_triggered", name=integration.name, failures=integration.failure_count)
    else:
        if integration.status != "healthy":
            integration.status = "healthy"
            integration.failure_count = 0
            logger.info("integration_recovered", name=integration.name)
            integration.failure_count = 0
            logger.info("integration_recovered", name=integration.name)