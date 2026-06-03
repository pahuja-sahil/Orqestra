import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.core.logger import logger
from app.core.circuit_breaker import get_redis
from app.core.encryption import encrypt_value
from app.models.github_connection import GitHubConnection
from app.models.integration import Integration
from app.services.auth_service import verify_token
from fastapi import Depends
import uuid

router = APIRouter()


@router.get("/connect")
async def github_connect(request: Request):
    """
    Redirects user to GitHub OAuth page.
    Uses opaque Redis-backed CSRF token instead of JWT in state param.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload["sub"]
    csrf_token = str(uuid.uuid4())

    try:
        redis = await get_redis()
        await redis.setex(f"github_oauth_state:{csrf_token}", 300, user_id)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to initialize OAuth")

    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.BACKEND_URL}/api/github/callback"
        f"&scope=repo,read:user,user:email"
        f"&state={csrf_token}"
    )
    return {"url": github_auth_url}


@router.get("/callback")
async def github_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    """
    GitHub redirects here after user approves.
    Exchange code for access token.
    Store token in DB (encrypted).
    """
    # Lookup user_id from Redis state
    try:
        redis = await get_redis()
        user_id = await redis.get(f"github_oauth_state:{state}")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid or expired state token")
        await redis.delete(f"github_oauth_state:{state}")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid state token")

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code
            }
        )
        token_data = token_response.json()

    github_token = token_data.get("access_token")
    if not github_token:
        raise HTTPException(status_code=400,
                            detail="Failed to get GitHub token")

    # Get GitHub user info
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        github_user = user_response.json()

    github_username = github_user.get("login")
    github_email = github_user.get("email")
    avatar_url = github_user.get("avatar_url")

    # Encrypt token before storing
    encrypted_token = encrypt_value(github_token)

    # Save or update in DB
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == uuid.UUID(user_id)
        )
    )
    connection = result.scalar_one_or_none()

    if connection:
        connection.github_token = encrypted_token
        connection.github_username = github_username
        connection.github_email = github_email
        connection.avatar_url = avatar_url
    else:
        connection = GitHubConnection(
            user_id=uuid.UUID(user_id),
            github_token=encrypted_token,
            github_username=github_username,
            github_email=github_email,
            avatar_url=avatar_url
        )
        db.add(connection)

    await db.commit()
    logger.info("github_connected", username=github_username)

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard/settings?github=connected"
    )


@router.get("/status")
async def github_status(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if user has connected GitHub.
    Returns connection status + username.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload["sub"]

    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == uuid.UUID(user_id)
        )
    )
    connection = result.scalar_one_or_none()

    if not connection:
        return {"connected": False}

    return {
        "connected": True,
        "username": connection.github_username,
        "avatar_url": connection.avatar_url
    }


@router.delete("/disconnect")
async def github_disconnect(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Remove GitHub connection for user."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload["sub"]

    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == uuid.UUID(user_id)
        )
    )
    connection = result.scalar_one_or_none()

    if connection:
        await db.delete(connection)
        await db.commit()

    return {"message": "GitHub disconnected"}

@router.post("/analyze")
async def analyze_github_repo(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Analyzes a GitHub repository and returns key information."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload["sub"]
    body = await request.json()
    repo_url = body.get("repo_url")
    
    if not repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")
        
    try:
        from app.services.github_service import analyze_repo
        result = await analyze_repo(repo_url, user_id, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("analyze_repo_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to analyze repository")

@router.post("/create-pr")
async def create_pr(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a PR in user's repo with generated integration code.
    Code is validated server-side — re-fetched from DB if integration_id is provided.
    PR is created BEFORE committing the integration record (issue #15 fix).
    Idempotent: checks for existing open PR on the same branch prefix (issue #18 fix).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload["sub"]
    body = await request.json()

    required = ["repo_path", "api_name", "target_file", "default_branch"]
    for field in required:
        if not body.get(field):
            raise HTTPException(
                status_code=400,
                detail=f"{field} is required"
            )

    # Issue #6: Validate code server-side
    generated_code = body.get("generated_code", "")
    integration_id = body.get("integration_id", "")
    if integration_id:
        # Re-fetch generated code from DB — never trust client-submitted code
        result = await db.execute(
            select(Integration).where(
                Integration.id == integration_id,
                Integration.user_id == uuid.UUID(user_id)
            )
        )
        existing_integration = result.scalar_one_or_none()
        if existing_integration and existing_integration.generated_code:
            generated_code = existing_integration.generated_code

    if not generated_code or len(generated_code.strip()) < 10:
        raise HTTPException(status_code=400, detail="Valid generated_code is required")

    try:
        from app.services.github_service import create_integration_pr

        real_api_name = body.get("real_api_name") or body["api_name"]
        raw_repo_url = body.get("repo_url", "")
        full_repo_url = raw_repo_url if raw_repo_url.startswith("http") else f"https://github.com/{raw_repo_url}"

        # Issue #15: Create PR FIRST, then commit integration
        result = await create_integration_pr(
            repo_path=body["repo_path"],
            api_name=body["api_name"],
            target_file=body["target_file"],
            generated_code=generated_code,
            default_branch=body["default_branch"],
            user_id=user_id,
            db=db
        )

        integration = Integration(
            user_id=uuid.UUID(user_id),
            name=f"{real_api_name} integration",
            api_name=real_api_name,
            description=f"Auto-generated {real_api_name} integration for {body['repo_path']}",
            generated_code=generated_code,
            language="python",
            status="pr_pending",
            repo_url=full_repo_url,
            repo_path=body["repo_path"],
            file_path=result["file"],
            default_branch=body["default_branch"],
            pr_url=result.get("pr_url", ""),
        )
        db.add(integration)
        await db.commit()
        
        logger.info("integration_created_from_pr", repo=body["repo_path"])

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="PR creation failed")