"""PDF 导出服务测试（骨架行为）"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.repositories.resume_repository import ResumeRepository
from app.services.pdf_service import PDFService


@pytest.mark.asyncio
async def test_export_not_found(db_session: AsyncSession):
    """不存在的简历抛 NotFound"""
    service = PDFService(db_session)
    with pytest.raises(NotFound):
        await service.export_resume_pdf(999, 1)


@pytest.mark.asyncio
async def test_export_empty_content(db_session: AsyncSession):
    """无内容的简历抛 BadRequest"""
    repo = ResumeRepository(db_session)
    resume = await repo.create(
        user_id=1,
        company_name="Acme",
        jd_text="JD",
        target_language="english",
    )
    service = PDFService(db_session)
    with pytest.raises(BadRequest, match="简历内容为空"):
        await service.export_resume_pdf(resume.id, 1)


@pytest.mark.asyncio
async def test_export_not_implemented(db_session: AsyncSession):
    """有内容时抛 NotImplementedError（功能开发中）"""
    repo = ResumeRepository(db_session)
    resume = await repo.create(
        user_id=1,
        company_name="Acme",
        jd_text="JD",
        target_language="english",
    )
    version = await repo.create_version(
        resume_id=resume.id,
        content={"doc": {"type": "doc"}},
        version_number=1,
    )
    resume.current_version_id = version.id
    await db_session.flush()

    service = PDFService(db_session)
    with pytest.raises(NotImplementedError):
        await service.export_resume_pdf(resume.id, 1)


@pytest.mark.asyncio
async def test_cleanup_temp_files(db_session: AsyncSession):
    """清理临时目录"""
    service = PDFService(db_session)
    await service.cleanup_temp_files()
