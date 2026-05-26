from github import Github, GithubException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.github_connection import GitHubConnection
from app.core.logger import logger
import uuid


async def get_github_client(user_id: str, db: AsyncSession):
    """
    Gets PyGithub client for the user.
    Reads their stored token from DB.
    """
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == uuid.UUID(user_id)
        )
    )
    connection = result.scalar_one_or_none()

    if not connection:
        raise ValueError("GitHub not connected. Please connect GitHub in Settings.")

    return Github(connection.github_token), connection.github_username


async def analyze_repo(
    repo_url: str,
    user_id: str,
    db: AsyncSession,
    api_name: str = ""
) -> dict:
    """
    Analyzes a GitHub repo:
    1. Fetches file structure
    2. Reads key files AND any files whose name/content matches api_name
    3. Detects existing integrations
    4. Finds best file to add new code — API-name-aware
    """
    try:
        g, username = await get_github_client(user_id, db)

        repo_path = repo_url.replace("https://github.com/", "")
        repo_path = repo_path.replace("http://github.com/", "")
        repo_path = repo_path.strip("/")

        logger.info("analyzing_repo", repo=repo_path, user=user_id, api=api_name)

        repo = g.get_repo(repo_path)

        # Try main first, fall back to master
        try:
            contents = repo.get_git_tree(sha="main", recursive=True)
        except Exception:
            contents = repo.get_git_tree(sha="master", recursive=True)

        all_files = [f.path for f in contents.tree if f.type == "blob"]

        # Detect language from repo structure
        language = "python"
        has_package_json = any(f == "package.json" or f.endswith("/package.json") for f in all_files)
        has_py = any(f.endswith(".py") for f in all_files)
        has_ts = any(f.endswith(".ts") or f.endswith(".tsx") for f in all_files)
        if has_package_json and (has_ts or not has_py):
            language = "typescript" if has_ts else "javascript"
        elif has_py:
            language = "python"

        # Build list of files to read: standard key files + any file whose
        # name contains the api_name (e.g. razorpay.py, payment_razorpay.js)
        api_slug = api_name.lower().replace(" ", "") if api_name else ""
        key_files = [
            "requirements.txt", "package.json",
            "main.py", "app.py", "app/__init__.py",
            "index.js", "index.ts",
            "src/index.js", "src/index.ts",
        ]

        # Collect all source files that might hold integration code
        ext_map = {"python": ".py", "javascript": ".js", "typescript": ".ts"}
        src_ext = ext_map.get(language, ".py")
        SKIP_DIRS = {"venv", ".venv", "node_modules", "__pycache__", ".git", "dist", "build", "migrations", "test", "tests"}

        source_files = [
            f for f in all_files
            if f.endswith(src_ext)
            and not any(skip in f.split("/") for skip in SKIP_DIRS)
        ]

        # Priority 1: files whose NAME directly matches the api (e.g. razorpay.py)
        api_named_files = [f for f in source_files if api_slug and api_slug in f.lower()]

        # Priority 2: service/payment/integration directories
        service_files = [
            f for f in source_files
            if any(kw in f.lower() for kw in ["service", "payment", "integration", "gateway", "billing"])
        ]

        files_to_read = list(dict.fromkeys(key_files + api_named_files + service_files + source_files))
        files_to_read = [f for f in files_to_read if f in all_files][:20]  # cap at 20

        key_files_content = {}
        for file_path in files_to_read:
            try:
                content_obj = repo.get_contents(file_path)
                text = content_obj.decoded_content.decode("utf-8")
                key_files_content[file_path] = text
                logger.info("file_read", file=file_path)
            except Exception:
                pass

        # Detect existing integrations by scanning ALL read files
        integration_keywords = {
            "stripe": ["stripe", "payment_intent", "stripe.Charge"],
            "razorpay": ["razorpay", "Razorpay", "razorpay_client"],
            "github": ["PyGithub", "octokit", "@octokit"],
            "twilio": ["twilio", "TwilioClient", "from twilio"],
            "sendgrid": ["sendgrid", "SendGridAPIClient"],
            "openai": ["openai", "ChatOpenAI", "from openai"],
            "shopify": ["shopify", "ShopifyAPI"],
            "slack": ["slack_sdk", "WebClient", "slack-bolt"],
            "aws": ["boto3", "aws_access", "import boto"],
            "firebase": ["firebase_admin", "firestore", "initializeApp"],
            "mongodb": ["pymongo", "MongoClient", "mongoose"],
            "redis": ["redis", "Redis", "aioredis"],
            "paypal": ["paypalrestsdk", "paypal"],
        }
        all_content_joined = " ".join(key_files_content.values()).lower()
        existing_integrations = [
            api for api, keywords in integration_keywords.items()
            if any(kw.lower() in all_content_joined for kw in keywords)
        ]

        # Find the best target file using API-aware logic
        best_file, existing_file_content = find_best_file(
            all_files=all_files,
            source_files=source_files,
            language=language,
            api_slug=api_slug,
            api_named_files=api_named_files,
            service_files=service_files,
            key_files_content=key_files_content
        )

        logger.info("repo_analyzed",
                    repo=repo_path,
                    language=language,
                    files=len(all_files),
                    existing=existing_integrations,
                    target_file=best_file,
                    has_existing_content=bool(existing_file_content))

        return {
            "repo_path": repo_path,
            "repo_name": repo.name,
            "api_name": api_name or repo.name,
            "language": language,
            "all_files": all_files[:50],
            "key_files_content": key_files_content,
            "existing_integrations": existing_integrations,
            "best_file": best_file,
            "existing_file_content": existing_file_content,  # content of the target file if it already exists
            "default_branch": repo.default_branch,
            "description": repo.description or ""
        }

    except GithubException as e:
        logger.error("github_api_error", error=str(e))
        raise ValueError(f"GitHub API error: {str(e)}")
    except Exception as e:
        logger.error("repo_analysis_failed", error=str(e))
        raise


def find_best_file(
    all_files: list,
    source_files: list,
    language: str,
    api_slug: str = "",
    api_named_files: list = None,
    service_files: list = None,
    key_files_content: dict = None
) -> tuple[str, str]:
    """
    Returns (target_file_path, existing_content_or_empty).
    Decision order:
      1. File whose NAME contains the api slug (e.g. razorpay.py)
      2. File whose CONTENT already imports / references the api
      3. Generic service/payment/integration file
      4. Fallback: create a sensible new file
    """
    api_named_files = api_named_files or []
    service_files = service_files or []
    key_files_content = key_files_content or {}
    ext = ".py" if language == "python" else (".ts" if language == "typescript" else ".js")

    # 1. File whose name directly matches the API (razorpay.py, stripe_service.py, etc.)
    if api_named_files:
        best = api_named_files[0]
        return best, key_files_content.get(best, "")

    # 2. File whose CONTENT already references the api
    if api_slug and key_files_content:
        for path, content in key_files_content.items():
            if api_slug in content.lower() and path.endswith(ext):
                logger.info("target_by_content_match", file=path, api=api_slug)
                return path, content

    # 3. Generic service / payment / integration file
    if service_files:
        best = service_files[0]
        return best, key_files_content.get(best, "")

    # 4. Any existing source file (non-test, non-venv)
    for f in source_files:
        if f.endswith(ext):
            return f, key_files_content.get(f, "")

    # 5. Nothing found — suggest a clean new file named after the API
    if api_slug:
        if language == "python":
            new_file = f"services/{api_slug}_integration{ext}"
        else:
            new_file = f"src/services/{api_slug}Integration{ext}"
    else:
        new_file = f"integrations{ext}"

    return new_file, ""


async def create_integration_pr(
    repo_path: str,
    api_name: str,
    target_file: str,
    generated_code: str,
    default_branch: str,
    user_id: str,
    db: AsyncSession
) -> dict:
    """
    Creates a PR in user's repo with the generated integration code.
    """
    if not generated_code or len(generated_code.strip()) < 10 or "encountered an issue" in generated_code:
        logger.error("invalid_code_for_pr", code=generated_code[:50])
        raise ValueError("Invalid integration code. PR aborted to prevent repository corruption.")

    try:
        g, username = await get_github_client(user_id, db)
        repo = g.get_repo(repo_path)

        import time
        branch_name = f"orqestra/integrate-{api_name.lower().replace(' ', '-')}-{int(time.time())}"

        base_ref = repo.get_git_ref(f"heads/{default_branch}")
        base_sha = base_ref.object.sha

        try:
            repo.create_git_ref(
                ref=f"refs/heads/{branch_name}",
                sha=base_sha
            )
            logger.info("branch_created", branch=branch_name)
        except Exception:
            existing_ref = repo.get_git_ref(f"heads/{branch_name}")
            existing_ref.edit(sha=base_sha, force=True)
            logger.info("branch_updated", branch=branch_name)

        file_exists = False
        existing_sha = None
        try:
            existing_file = repo.get_contents(target_file, ref=branch_name)
            file_exists = True
            existing_sha = existing_file.sha
        except Exception:
            file_exists = False

        commit_message = f"feat: add {api_name} integration via ORQESTRA"

        if file_exists:
            repo.update_file(
                path=str(target_file),
                message=str(commit_message),
                content=str(generated_code),
                sha=str(existing_sha),
                branch=str(branch_name)
            )
        else:
            repo.create_file(
                path=str(target_file),
                message=str(commit_message),
                content=str(generated_code),
                branch=str(branch_name)
            )

        logger.info("file_committed",
                    file=target_file,
                    branch=branch_name)

        pr = repo.create_pull(
            title=str(f"ORQESTRA: Integrate {api_name}"),
            body=str(f"""## {api_name} Integration by ORQESTRA ⚡

This PR was automatically generated by ORQESTRA.

### What was added
- Complete {api_name} integration in `{target_file}`
- Authentication setup
- Error handling
- Production-ready code

### Files Changed
- `{target_file}`

### Next Steps
1. Review the generated code
2. Add your API keys to environment variables
3. Test the integration
4. Merge when ready — ORQESTRA will start monitoring automatically

---
*Generated by ORQESTRA Autonomous API Integration Platform*
"""),
            head=branch_name,
            base=default_branch
        )

        logger.info("pr_created",
                    pr_number=pr.number,
                    pr_url=pr.html_url,
                    repo=repo_path)

        return {
            "pr_url": pr.html_url,
            "pr_number": pr.number,
            "branch": branch_name,
            "file": target_file
        }

    except Exception as e:
        error_details = repr(e)
        if hasattr(e, 'data'):
            error_details += f" | Data: {e.data}"
        logger.error("pr_creation_failed", error=error_details)
        raise Exception(f"PR creation failed: {error_details}")