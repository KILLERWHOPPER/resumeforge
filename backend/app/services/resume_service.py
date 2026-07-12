"""简历管理服务 — 不包含 AI 生成"""

from __future__ import annotations

from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.resume import Resume
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeCreate, ResumeResponse, ResumeContentUpdate


class ResumeService:
    """简历管理服务"""

    def __init__(self, db: AsyncSession):
        self.repo = ResumeRepository(db)

    async def list_resumes(self, user_id: int) -> Sequence[Resume]:
        """获取用户所有简历"""
        return await self.repo.list_by_user(user_id)

    async def create_resume(
        self,
        user_id: int,
        data: ResumeCreate,
    ) -> Resume:
        """创建新简历"""
        return await self.repo.create(
            user_id=user_id,
            company_name=data.company_name,
            jd_text=data.jd_text,
            target_language=data.target_language,
        )

    async def get_resume(self, resume_id: int, user_id: int) -> Resume:
        """获取单个简历"""
        resume = await self.repo.get(resume_id)
        if not resume:
            raise NotFound("简历不存在")
        if resume.user_id != user_id:
            raise NotFound("简历不存在")
        return resume

    async def delete_resume(self, resume_id: int, user_id: int) -> None:
        """删除简历"""
        resume = await self.get_resume(resume_id, user_id)
        await self.repo.db.delete(resume)

    async def get_resume_content(self, resume_id: int, user_id: int) -> dict:
        """获取简历内容"""
        resume = await self.get_resume(resume_id, user_id)
        if not resume.current_version_id:
            return {"content": None, "version": None}

        version = await self.repo.get_current_version(resume)
        if not version:
            return {"content": None, "version": None}

        return {
            "content": version.content,
            "version": version.version_number,
        }

    async def update_resume_content(
        self,
        resume_id: int,
        user_id: int,
        data: ResumeContentUpdate,
        if_match: str | None,
    ) -> dict:
        """更新简历内容（带乐观锁）"""
        if not if_match:
            raise BadRequest("缺少 If-Match 头")

        resume = await self.get_resume(resume_id, user_id)

        # 验证版本号
        current_version = None
        if resume.current_version_id:
            current_version = await self.repo.get_current_version(resume)
            if current_version and str(current_version.version_number) != if_match:
                raise BadRequest("内容已在其他地方更新，请刷新后重试")

        # 创建新版本
        new_version_number = (current_version.version_number + 1) if current_version else 1
        new_version = await self.repo.create_version(
            resume_id=resume_id,
            content=data.content,
            version_number=new_version_number,
        )

        resume.current_version_id = new_version.id
        await self.repo.db.flush()

        return {"message": "保存成功", "version": new_version_number}
