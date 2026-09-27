"""Prompt 模板 Repository"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt_template import PromptTemplate
from app.repositories.base import BaseRepository


class PromptTemplateRepository(BaseRepository[PromptTemplate]):
    """Prompt 模板 Repository"""

    def __init__(self, db: AsyncSession):
        super().__init__(PromptTemplate, db)

    async def list_by_key(self, key: str) -> Sequence[PromptTemplate]:
        """获取某 key 的所有版本（按版本倒序）"""
        result = await self.db.execute(
            select(PromptTemplate)
            .where(PromptTemplate.key == key)
            .order_by(PromptTemplate.version.desc())
        )
        return result.scalars().all()

    async def get_active(self, key: str) -> PromptTemplate | None:
        """获取某 key 当前激活的模板"""
        result = await self.db.execute(
            select(PromptTemplate).where(
                PromptTemplate.key == key,
                PromptTemplate.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def deactivate_all(self, key: str) -> None:
        """取消某 key 所有版本的激活状态"""
        result = await self.db.execute(
            select(PromptTemplate).where(
                PromptTemplate.key == key,
                PromptTemplate.is_active.is_(True),
            )
        )
        for tpl in result.scalars().all():
            tpl.is_active = False
        await self.db.flush()

    async def get_max_version(self, key: str) -> int:
        """获取某 key 的最大版本号，无记录时返回 0"""
        result = await self.db.execute(
            select(PromptTemplate.version)
            .where(PromptTemplate.key == key)
            .order_by(PromptTemplate.version.desc())
            .limit(1)
        )
        return result.scalar() or 0
