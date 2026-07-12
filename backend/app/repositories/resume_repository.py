"""简历 Repository"""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.resume import Resume, ResumeVersion, JDAnalysis
from app.repositories.base import BaseRepository


class ResumeRepository(BaseRepository[Resume]):
    """简历 Repository"""

    def __init__(self, db):
        super().__init__(Resume, db)

    async def list_by_user(self, user_id: int) -> Sequence[Resume]:
        """获取用户的所有简历，按创建时间倒序"""
        result = await self.db.execute(
            select(Resume)
            .where(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
        )
        return result.scalars().all()

    async def get_with_versions(self, resume_id: int) -> Resume | None:
        """获取简历并预加载版本列表"""
        result = await self.db.execute(
            select(Resume)
            .where(Resume.id == resume_id)
            .options(selectinload(Resume.versions))
        )
        return result.scalar_one_or_none()

    async def get_current_version(self, resume: Resume) -> ResumeVersion | None:
        """获取简历的当前版本内容"""
        if not resume.current_version_id:
            return None
        result = await self.db.execute(
            select(ResumeVersion).where(ResumeVersion.id == resume.current_version_id)
        )
        return result.scalar_one_or_none()

    async def create_version(
        self,
        resume_id: int,
        content: dict,
        version_number: int,
    ) -> ResumeVersion:
        """创建新版本"""
        version = ResumeVersion(
            resume_id=resume_id,
            version_number=version_number,
            content=content,
        )
        self.db.add(version)
        await self.db.flush()
        return version

    # ---- JD Analysis ----

    async def get_jd_analysis(self, resume_id: int) -> JDAnalysis | None:
        """获取 JD 分析结果"""
        result = await self.db.execute(
            select(JDAnalysis).where(JDAnalysis.resume_id == resume_id)
        )
        return result.scalar_one_or_none()
