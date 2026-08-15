"""简历管理服务 — 不包含 AI 生成"""

# ruff: noqa: TRY003

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.resume import Resume
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeContentUpdate, ResumeCreate


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

    async def get_resume_content(self, resume_id: int, user_id: int) -> dict[str, Any]:
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
    ) -> dict[str, Any]:
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

    async def list_versions(self, resume_id: int, user_id: int) -> list[dict[str, Any]]:
        """获取简历版本历史（含当前版本标记）"""
        resume = await self.get_resume(resume_id, user_id)
        versions = await self.repo.list_versions(resume.id)
        return [
            {
                "version_number": v.version_number,
                "created_at": v.created_at,
                "is_current": v.id == resume.current_version_id,
            }
            for v in versions
        ]

    async def get_version_content(
        self, resume_id: int, version_number: int, user_id: int
    ) -> dict[str, Any]:
        """获取指定版本的内容"""
        resume = await self.get_resume(resume_id, user_id)
        version = await self.repo.get_version(resume.id, version_number)
        if not version:
            raise NotFound("版本不存在")
        return {
            "version_number": version.version_number,
            "created_at": version.created_at,
            "content": version.content,
        }

    async def restore_version(
        self, resume_id: int, version_number: int, user_id: int
    ) -> dict[str, Any]:
        """恢复指定版本为当前内容（历史不可变，新写一个版本）"""
        resume = await self.get_resume(resume_id, user_id)
        version = await self.repo.get_version(resume.id, version_number)
        if not version:
            raise NotFound("版本不存在")

        current = await self.repo.get_current_version(resume)
        current_number = current.version_number if current else 0
        new_version = await self.repo.create_version(
            resume_id=resume.id,
            content=version.content,
            version_number=current_number + 1,
        )
        resume.current_version_id = new_version.id
        await self.repo.db.flush()

        return {"message": "已恢复至指定版本", "version": new_version.version_number}

    async def branch_resume(
        self, resume_id: int, version_number: int, user_id: int
    ) -> Resume:
        """从指定版本派生一份新简历（分支复用）"""
        resume = await self.get_resume(resume_id, user_id)
        version = await self.repo.get_version(resume.id, version_number)
        if not version:
            raise NotFound("版本不存在")

        branch = await self.repo.create(
            user_id=user_id,
            company_name=resume.company_name,
            jd_text=resume.jd_text,
            target_language=resume.target_language,
        )
        new_version = await self.repo.create_version(
            resume_id=branch.id,
            content=version.content,
            version_number=1,
        )
        branch.current_version_id = new_version.id
        branch.status = "generated"
        await self.repo.db.flush()

        return branch
