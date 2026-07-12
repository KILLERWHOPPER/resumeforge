"""经历 Repository"""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select

from app.models.experience import Experience
from app.repositories.base import BaseRepository


class ExperienceRepository(BaseRepository[Experience]):
    """经历 Repository"""

    def __init__(self, db):
        super().__init__(Experience, db)

    async def list_by_user(
        self,
        user_id: int,
        type_filter: str | None = None,
    ) -> Sequence[Experience]:
        """获取用户的所有经历，可选按类型筛选"""
        query = select(Experience).where(Experience.user_id == user_id)
        if type_filter:
            query = query.where(Experience.type == type_filter)
        query = query.order_by(Experience.sort_order)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def reorder(self, user_id: int, order: list[int]) -> None:
        """批量更新排序"""
        for idx, exp_id in enumerate(order):
            result = await self.db.execute(
                select(Experience).where(
                    Experience.id == exp_id,
                    Experience.user_id == user_id,
                )
            )
            experience = result.scalar_one_or_none()
            if experience:
                experience.sort_order = idx
        await self.db.flush()
