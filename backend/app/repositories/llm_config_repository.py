"""LLM 配置 Repository"""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select

from app.models.llm_config import LLMConfig
from app.repositories.base import BaseRepository


class LLMConfigRepository(BaseRepository[LLMConfig]):
    """LLM 配置 Repository"""

    def __init__(self, db):
        super().__init__(LLMConfig, db)

    async def list_by_user(self, user_id: int) -> Sequence[LLMConfig]:
        """获取用户的所有 LLM 配置"""
        result = await self.db.execute(
            select(LLMConfig).where(LLMConfig.user_id == user_id)
        )
        return result.scalars().all()

    async def get_active(self, user_id: int) -> LLMConfig | None:
        """获取用户当前激活的 LLM 配置"""
        result = await self.db.execute(
            select(LLMConfig).where(
                LLMConfig.user_id == user_id,
                LLMConfig.is_active == True,
            )
        )
        return result.scalar_one_or_none()

    async def deactivate_all(self, user_id: int) -> None:
        """取消用户所有 LLM 配置的激活状态"""
        result = await self.db.execute(
            select(LLMConfig).where(
                LLMConfig.user_id == user_id,
                LLMConfig.is_active == True,
            )
        )
        for config in result.scalars().all():
            config.is_active = False
        await self.db.flush()
