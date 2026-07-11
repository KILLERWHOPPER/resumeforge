"""API v1 — LLM 配置路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.llm_config import LLMConfig
from app.schemas.resume import LLMConfigCreate, LLMConfigResponse

router = APIRouter()


def _get_current_user_id():
    return 1


@router.get("/", response_model=list[LLMConfigResponse])
async def list_llm_configs(db: AsyncSession = Depends(get_db)):
    """获取所有 LLM 配置"""
    user_id = _get_current_user_id()
    result = await db.execute(
        select(LLMConfig).where(LLMConfig.user_id == user_id)
    )
    configs = result.scalars().all()
    return [
        LLMConfigResponse(
            id=c.id,
            name=c.name,
            base_url=c.base_url,
            model_name=c.model_name,
            is_active=c.is_active,
            api_key_masked=c.api_key_encrypted[:8] + "..." if c.api_key_encrypted else None,
        )
        for c in configs
    ]


@router.post("/", response_model=LLMConfigResponse, status_code=201)
async def create_llm_config(data: LLMConfigCreate, db: AsyncSession = Depends(get_db)):
    """创建 LLM 配置"""
    user_id = _get_current_user_id()

    # TODO: 实际的 AES-256-GCM 加密
    api_key_encrypted = data.api_key

    config = LLMConfig(
        user_id=user_id,
        name=data.name,
        base_url=data.base_url,
        api_key_encrypted=api_key_encrypted,
        model_name=data.model_name,
        is_active=data.is_active,
    )
    db.add(config)
    await db.flush()

    return LLMConfigResponse(
        id=config.id,
        name=config.name,
        base_url=config.base_url,
        model_name=config.model_name,
        is_active=config.is_active,
        api_key_masked=data.api_key[:8] + "...",
    )


@router.put("/{config_id}/activate")
async def activate_llm_config(config_id: int, db: AsyncSession = Depends(get_db)):
    """激活指定配置"""
    user_id = _get_current_user_id()

    # 先取消所有激活
    result = await db.execute(
        select(LLMConfig).where(LLMConfig.user_id == user_id, LLMConfig.is_active == True)
    )
    for config in result.scalars().all():
        config.is_active = False

    # 激活指定配置
    target = await db.execute(
        select(LLMConfig).where(LLMConfig.id == config_id, LLMConfig.user_id == user_id)
    )
    target_config = target.scalar_one_or_none()
    if not target_config:
        raise HTTPException(status_code=404, detail="配置不存在")

    target_config.is_active = True
    return {"message": f"已激活: {target_config.name}"}


@router.delete("/{config_id}", status_code=204)
async def delete_llm_config(config_id: int, db: AsyncSession = Depends(get_db)):
    """删除 LLM 配置"""
    user_id = _get_current_user_id()
    result = await db.execute(
        select(LLMConfig).where(LLMConfig.id == config_id, LLMConfig.user_id == user_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    await db.delete(config)
    return None
