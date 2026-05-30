from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.logger import logger
from app.models.integration import Integration
from app.services.auth_service import verify_token
from app.agents.orqestra_agent import run_orqestra_agent
import uuid

router = APIRouter()


def get_current_user_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["sub"]


@router.get("")
async def list_integrations(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user_id = get_current_user_id(request)
    result = await db.execute(
        select(Integration).where(
            Integration.user_id == user_id,
            Integration.is_active == True
        )
    )
    integrations = result.scalars().all()
    return [
        {
            "id": str(i.id),
            "name": i.name,
            "api_name": i.api_name,
            "status": i.status,
            "circuit_state": i.circuit_state,
            "failure_count": i.failure_count,
            "last_checked": i.last_checked,
            "created_at": i.created_at,
            "repo_url": i.repo_url,
            "file_path": i.file_path,
        }
        for i in integrations
    ]


@router.post("")
async def create_integration(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user_id = get_current_user_id(request)
    body = await request.json()

    name = body.get("name", "")
    description = body.get("description", "")

    if not name:
        raise HTTPException(status_code=400, detail="Name required")

    prompt = f"Create integration: {name}. {description}"
    generated_code = await run_orqestra_agent(prompt, source="text")

    from sqlalchemy.dialects.postgresql import UUID as PGUUID
    integration = Integration(
        user_id=uuid.UUID(user_id),
        name=name,
        api_name=body.get("api_name", "general"),
        description=description,
        generated_code=generated_code,
        language=body.get("language", "python"),
        status="healthy"
    )
    db.add(integration)
    await db.commit()
    await db.refresh(integration)

    logger.info("integration_created", name=name, user=user_id)
    return {
        "id": str(integration.id),
        "name": integration.name,
        "status": integration.status,
        "generated_code": integration.generated_code
    }


@router.get("/{integration_id}/health")
async def get_integration_health(
    integration_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user_id = get_current_user_id(request)
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.user_id == user_id
        )
    )
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    return {
        "id": str(integration.id),
        "name": integration.name,
        "api_name": integration.api_name,
        "status": integration.status,
        "circuit_state": integration.circuit_state,
        "failure_count": integration.failure_count,
        "repair_attempts": integration.repair_attempts,
        "last_checked": integration.last_checked,
        "last_repaired": integration.last_repaired,
        "health_check": integration.health_check,
        "file_path": integration.file_path,
        "repo_url": integration.repo_url,
        "pr_url": integration.pr_url,
        "language": integration.language,
        "created_at": integration.created_at,
        "updated_at": integration.updated_at,
        "generated_code": integration.generated_code
    }


@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user_id = get_current_user_id(request)
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.user_id == user_id
        )
    )
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Not found")

    integration.is_active = False
    await db.commit()
    return {"message": "Integration deleted"}