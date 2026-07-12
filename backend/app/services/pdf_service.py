"""PDF 导出服务（骨架）"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequest, NotFound
from app.repositories.resume_repository import ResumeRepository


class PDFService:
    """PDF 导出服务"""

    def __init__(self, db: AsyncSession):
        self.repo = ResumeRepository(db)
        self.temp_dir = Path(settings.PDF_TEMP_DIR)

    async def export_resume_pdf(self, resume_id: int, user_id: int) -> bytes:
        """导出简历为 PDF（骨架实现）"""
        resume = await self.repo.get(resume_id)
        if not resume:
            raise NotFound("简历不存在")
        if resume.user_id != user_id:
            raise NotFound("简历不存在")

        if not resume.current_version_id:
            raise BadRequest("简历内容为空，无法导出")

        version = await self.repo.get_current_version(resume)
        if not version:
            raise BadRequest("简历内容为空，无法导出")

        # TODO: 使用 WeasyPrint 将 HTML 渲染为 PDF
        # 需要先从 version.content（ProseMirror JSON）转换为 HTML
        raise NotImplementedError("PDF 导出功能开发中")

    async def cleanup_temp_files(self) -> None:
        """清理临时 PDF 文件"""
        if self.temp_dir.exists():
            for f in self.temp_dir.iterdir():
                f.unlink()
            self.temp_dir.rmdir()
