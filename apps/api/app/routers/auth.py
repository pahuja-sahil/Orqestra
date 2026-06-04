from fastapi import APIRouter, Request, Response, HTTPException, Depends, Cookie
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from authlib.integrations.httpx_client import AsyncOAuth2Client
from app.services.notification_service import send_welcome_email
from app.core.config import settings
from app.core.database import get_db
from app.core.logger import logger
from app.models.user import User
from app.models.token import TokenResponse, GoogleCallbackResponse
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    create_pending_2fa_token,
    verify_token,
    generate_totp_secret,
    verify_totp,
    generate_qr_code
)
import httpx

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def set_refresh_token_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production" or settings.BEHIND_PROXY,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api"
    )


@router.get("/google")
async def google_login():
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    logger.info("google_login_initiated", redirect_uri=params["redirect_uri"])
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")


@router.get("/google/callback")
async def google_callback(
    code: str,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": f"{settings.BACKEND_URL}/api/auth/google/callback",
                "grant_type": "authorization_code",
            }
        )
        token_data = token_response.json()
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        google_user = userinfo_response.json()

    result = await db.execute(
        select(User).where(User.google_id == google_user["sub"])
    )
    user = result.scalar_one_or_none()

    if not user:
        result = await db.execute(
            select(User).where(User.email == google_user["email"])
        )
        user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=google_user["email"],
            name=google_user.get("name", ""),
            google_id=google_user["sub"],
            profile_picture=google_user.get("picture"),
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("user_created", email=user.email)
        await send_welcome_email(user.email, user.name)

    user_id = str(user.id)

    if user.is_2fa_enabled:
        pending_token = create_pending_2fa_token(user_id, user.email)
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/auth/2fa?token={pending_token}"
        )

    access_token = create_access_token({"sub": user_id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user_id})

    redirect = RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard")
    set_refresh_token_cookie(redirect, refresh_token)

    logger.info("user_logged_in", email=user.email)
    return redirect


@router.post("/2fa/verify")
async def verify_2fa(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    body = await request.json()
    pending_token = body.get("pending_token")
    code = body.get("code")

    payload = verify_token(pending_token, token_type="pending_2fa")
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_totp(user.totp_secret, code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")

    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    set_refresh_token_cookie(response, refresh_token)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/2fa/confirm")
async def confirm_2fa(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    body = await request.json()
    code = body.get("code")
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_totp(user.totp_secret, code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")
    user.is_2fa_enabled = True
    await db.commit()
    logger.info("2fa_enabled", email=user.email)
    return {"message": "2FA enabled successfully"}


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: AsyncSession = Depends(get_db)
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = verify_token(refresh_token, token_type="refresh")
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    set_refresh_token_cookie(response, new_refresh_token)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="refresh_token", path="/api")
    return {"message": "Logged out successfully"}


@router.get("/2fa/setup")
async def setup_2fa(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Regenerate: always create a new secret (invalidates any old one)
    secret = generate_totp_secret()
    user.totp_secret = secret
    user.is_2fa_enabled = False  # Must confirm new secret before enabling
    await db.commit()

    qr_code = generate_qr_code(secret, user.email)
    return {"qr_code": qr_code, "secret": secret, "note": "Old 2FA secret has been invalidated. Please confirm the new code to re-enable 2FA."}

@router.get("/me")
async def get_me(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "profile_picture": user.profile_picture,
        "is_2fa_enabled": user.is_2fa_enabled
    }

@router.patch("/me/name")
async def update_name(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    body = await request.json()
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.name = name
    await db.commit()
    return {"name": user.name}

@router.post("/2fa/disable")
async def disable_2fa(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    body = await request.json()
    code = body.get("code")
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_totp(user.totp_secret, code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")
    user.is_2fa_enabled = False
    user.totp_secret = None
    await db.commit()
    logger.info("2fa_disabled", email=user.email)
    return {"message": "2FA disabled successfully"}