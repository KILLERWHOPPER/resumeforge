"""经历管理服务"""

from __future__ import annotations

from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFound
from app.models.experience import Experience
from app.repositories.experience_repository import ExperienceRepository
from app.schemas.experience import (
    CertificateCreate,
    EducationCreate,
    ExperienceResponse,
    ExperienceUpdate,
    ProjectCreate,
    SkillCreate,
    WorkCreate,
)


class ExperienceService:
    """经历管理服务"""

    def __init__(self, db: AsyncSession):
        self.repo = ExperienceRepository(db)

    async def list_experiences(
        self,
        user_id: int,
        type_filter: str | None = None,
    ) -> Sequence[Experience]:
        """获取用户所有经历"""
        return await self.repo.list_by_user(user_id, type_filter)

    async def create_experience(
        self,
        user_id: int,
        data: EducationCreate | WorkCreate | ProjectCreate | SkillCreate | CertificateCreate,
    ) -> Experience:
        """创建经历"""
        experience_data = data.model_dump()
        experience_type = experience_data.pop("type")
        return await self.repo.create(
            user_id=user_id,
            type=experience_type,
            **{k: v for k, v in experience_data.items() if v is not None},
        )

    async def get_experience(self, experience_id: int, user_id: int) -> Experience:
        """获取单条经历"""
        experience = await self.repo.get(experience_id)
        if not experience:
            raise NotFound("经历不存在")
        if experience.user_id != user_id:
            raise NotFound("经历不存在")
        return experience

    async def update_experience(
        self,
        experience_id: int,
        user_id: int,
        data: ExperienceUpdate,
    ) -> Experience:
        """更新经历"""
        experience = await self.get_experience(experience_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(experience, key, value)
        await self.repo.db.flush()
        await self.repo.db.refresh(experience)
        return experience

    async def delete_experience(self, experience_id: int, user_id: int) -> None:
        """删除经历"""
        experience = await self.get_experience(experience_id, user_id)
        await self.repo.db.delete(experience)

    async def reorder_experiences(self, user_id: int, order: list[int]) -> None:
        """批量更新排序"""
        await self.repo.reorder(user_id, order)
