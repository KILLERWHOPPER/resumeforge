"""API v1 — Prompt 模板管理路由"""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.schemas.resume import (
    PromptTemplateActivate,
    PromptTemplateCreate,
    PromptTemplateResponse,
)
from app.services.prompt_template_service import TEMPLATE_REGISTRY, PromptTemplateService

router = APIRouter()


@router.get("/keys")
async def list_template_keys(
    user_id: int = Depends(get_current_user_id),
) -> list[dict[str, Any]]:
    """列出所有支持的模板 key 及其允许的占位符"""
    return [
        {"key": key, "variables": info["variables"]}
        for key, info in TEMPLATE_REGISTRY.items()
    ]


@router.get("/{key}", response_model=list[PromptTemplateResponse])
async def list_template_versions(
    key: str,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> list[PromptTemplateResponse]:
    """列出某 key 的所有模板版本"""
    service = PromptTemplateService(db)
    versions = await service.list_versions(key)
    return [PromptTemplateResponse.model_validate(t) for t in versions]


@router.post("/{key}", response_model=PromptTemplateResponse, status_code=201)
async def create_template_version(
    key: str,
    data: PromptTemplateCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> PromptTemplateResponse:
    """创建新版本模板（可选激活，激活时自动停用旧版本）"""
    service = PromptTemplateService(db)
    tpl = await service.create_version(
        key=key,
        system_template=data.system_template,
        description=data.description,
        activate=data.activate,
    )
    return PromptTemplateResponse.model_validate(tpl)


@router.put("/{key}/activate", response_model=PromptTemplateResponse)
async def activate_template_version(
    key: str,
    data: PromptTemplateActivate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> PromptTemplateResponse:
    """激活指定版本"""
    service = PromptTemplateService(db)
    tpl = await service.activate(key, data.version)
    return PromptTemplateResponse.model_validate(tpl)
