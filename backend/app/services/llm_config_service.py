"""LLM 配置服务"""

from __future__ import annotations

from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFound
from app.models.llm_config import LLMConfig
from app.repositories.llm_config_repository import LLMConfigRepository
from app.schemas.resume import LLMConfigCreate, LLMConfigResponse


class LLMConfigService:
    """LLM 配置服务"""

    def __init__(self, db: AsyncSession):
        self.repo = LLMConfigRepository(db)

    async def list_configs(self, user_id: int) -> list[LLMConfigResponse]:
        """获取所有 LLM 配置（脱敏后）"""
        configs = await self.repo.list_by_user(user_id)
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

    async def create_config(
        self,
        user_id: int,
        data: LLMConfigCreate,
    ) -> LLMConfigResponse:
        """创建 LLM 配置"""
        # TODO: 实际的 AES-256-GCM 加密
        api_key_encrypted = data.api_key

        config = await self.repo.create(
            user_id=user_id,
            name=data.name,
            base_url=data.base_url,
            api_key_encrypted=api_key_encrypted,
            model_name=data.model_name,
            is_active=data.is_active,
        )
        return LLMConfigResponse(
            id=config.id,
            name=config.name,
            base_url=config.base_url,
            model_name=config.model_name,
            is_active=config.is_active,
            api_key_masked=data.api_key[:8] + "...",
        )

    async def activate_config(self, config_id: int, user_id: int) -> dict:
        """激活指定配置"""
        # 先取消所有激活
        await self.repo.deactivate_all(user_id)

        # 激活指定配置
        config = await self.repo.get(config_id)
        if not config or config.user_id != user_id:
            raise NotFound("配置不存在")

        config.is_active = True
        await self.repo.db.flush()
        return {"message": f"已激活: {config.name}"}

    async def delete_config(self, config_id: int, user_id: int) -> None:
        """删除 LLM 配置"""
        config = await self.repo.get(config_id)
        if not config or config.user_id != user_id:
            raise NotFound("配置不存在")
        await self.repo.db.delete(config)

    async def get_active_config(self, user_id: int) -> LLMConfig | None:
        """获取用户当前激活的配置"""
        return await self.repo.get_active(user_id)
