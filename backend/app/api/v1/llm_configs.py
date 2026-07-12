"""API v1 — LLM 配置路由（使用 Service 层）"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.schemas.resume import LLMConfigCreate, LLMConfigResponse
from app.services.llm_config_service import LLMConfigService

router = APIRouter()


@router.get("/", response_model=list[LLMConfigResponse])
async def list_llm_configs(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """获取所有 LLM 配置"""
    service = LLMConfigService(db)
    return await service.list_configs(user_id)


@router.post("/", response_model=LLMConfigResponse, status_code=201)
async def create_llm_config(
    data: LLMConfigCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """创建 LLM 配置"""
    service = LLMConfigService(db)
    return await service.create_config(user_id, data)


@router.put("/{config_id}/activate")
async def activate_llm_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """激活指定配置"""
    service = LLMConfigService(db)
    return await service.activate_config(config_id, user_id)


@router.delete("/{config_id}", status_code=204)
async def delete_llm_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """删除 LLM 配置"""
    service = LLMConfigService(db)
    await service.delete_config(config_id, user_id)
    return None
