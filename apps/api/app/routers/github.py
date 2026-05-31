import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.core.logger import logger
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
    User approves → GitHub redirects back to /callback
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")

    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=repo,read:user,user:email"
        f"&state={token}"
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
    Store token in DB.
    """
    payload = verify_token(state)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid state token")

    user_id = payload["sub"]

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

    # Save or update in DB
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == uuid.UUID(user_id)
        )
    )
    connection = result.scalar_one_or_none()

    if connection:
        connection.github_token = github_token
        connection.github_username = github_username
        connection.github_email = github_email
        connection.avatar_url = avatar_url
    else:
        connection = GitHubConnection(
            user_id=uuid.UUID(user_id),
            github_token=github_token,
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
    Called after user confirms they want to commit the code.
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

    required = ["repo_path", "api_name", "target_file",
                "generated_code", "default_branch"]
    for field in required:
        if not body.get(field):
            raise HTTPException(
                status_code=400,
                detail=f"{field} is required"
            )

    try:
        from app.services.github_service import create_integration_pr

        # Store the real api_name from the converse session, not the repo name
        real_api_name = body.get("real_api_name") or body["api_name"]
        # Ensure repo_url is always stored with https:// prefix
        raw_repo_url = body.get("repo_url", "")
        full_repo_url = raw_repo_url if raw_repo_url.startswith("http") else f"https://github.com/{raw_repo_url}"

        # Create integration BEFORE PR creation so the self-healing icon
        # appears immediately on Logs and Integrations pages.
        integration = Integration(
            user_id=uuid.UUID(user_id),
            name=f"{real_api_name} integration",
            api_name=real_api_name,
            description=f"Auto-generated {real_api_name} integration for {body['repo_path']}",
            generated_code=body["generated_code"],
            language="python",
            status="healing",
            repo_url=full_repo_url,
            repo_path=body["repo_path"],
            file_path=body["target_file"],
            default_branch=body["default_branch"],
            pr_url=""
        )
        db.add(integration)
        await db.commit()
        await db.refresh(integration)

        result = await create_integration_pr(
            repo_path=body["repo_path"],
            api_name=body["api_name"],
            target_file=body["target_file"],
            generated_code=body["generated_code"],
            default_branch=body["default_branch"],
            user_id=user_id,
            db=db
        )

        integration.file_path = result["file"]
        integration.status = "pr_pending"
        integration.pr_url = result.get("pr_url", "")
        await db.commit()
        
        logger.info("integration_created_from_pr", repo=body["repo_path"])

        return result

    except ValueError as e:
        if 'integration' in dir() and integration.id:
            integration.status = "broken"
            await db.commit()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if 'integration' in dir() and integration.id:
            integration.status = "broken"
            await db.commit()
        raise HTTPException(status_code=500, detail="PR creation failed")