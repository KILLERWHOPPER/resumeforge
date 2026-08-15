"""PDF 导出服务测试"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.repositories.resume_repository import ResumeRepository
from app.services.pdf_service import PDFService, pm_to_html


def _sample_content() -> dict[str, object]:
    """构造标准 ProseMirror 文档"""
    return {
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 1},
                "content": [{"type": "text", "text": "张三"}],
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "资深后端工程师"}],
            },
            {
                "type": "heading",
                "attrs": {"level": 2},
                "content": [{"type": "text", "text": "工作经历"}],
            },
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Acme 公司 · 2020-01 - "},
                    {"type": "text", "text": "至今", "marks": [{"type": "strong"}]},
                ],
            },
            {
                "type": "bulletList",
                "content": [
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "负责核心服务开发"}],
                            }
                        ],
                    },
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [
                                    {"type": "text", "text": "性能优化"},
                                    {
                                        "type": "text",
                                        "text": "（提升 30%）",
                                        "marks": [{"type": "em"}],
                                    },
                                ],
                            }
                        ],
                    },
                ],
            },
        ],
    }


def test_pm_to_html_basic():
    """PM JSON 转换为 HTML 片段"""
    html = pm_to_html(_sample_content())
    assert "<h1>张三</h1>" in html
    assert "<p>资深后端工程师</p>" in html
    assert "<h2>工作经历</h2>" in html
    assert "<strong>至今</strong>" in html
    assert "<em>（提升 30%）</em>" in html
    assert "<li>负责核心服务开发</li>" in html


def test_pm_to_html_escapes_text():
    """文本内容做 HTML 转义"""
    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "<script>alert(1)</script>"}],
            }
        ],
    }
    html = pm_to_html(content)
    assert "&lt;script&gt;" in html
    assert "<script>" not in html


def test_pm_to_html_empty():
    """空文档返回空字符串"""
    assert pm_to_html({"type": "doc", "content": []}) == ""


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
async def test_export_generates_pdf(db_session: AsyncSession):
    """有内容时生成有效 PDF"""
    repo = ResumeRepository(db_session)
    resume = await repo.create(
        user_id=1,
        company_name="Acme",
        jd_text="JD",
        target_language="english",
    )
    version = await repo.create_version(
        resume_id=resume.id,
        content=_sample_content(),
        version_number=1,
    )
    resume.current_version_id = version.id
    await db_session.flush()

    service = PDFService(db_session)
    pdf = await service.export_resume_pdf(resume.id, 1)
    assert pdf.startswith(b"%PDF")
    assert b"%%EOF" in pdf


@pytest.mark.asyncio
async def test_export_other_users_resume(db_session: AsyncSession):
    """非本人简历视为不存在"""
    repo = ResumeRepository(db_session)
    resume = await repo.create(
        user_id=1,
        company_name="Acme",
        jd_text="JD",
        target_language="english",
    )
    version = await repo.create_version(
        resume_id=resume.id,
        content=_sample_content(),
        version_number=1,
    )
    resume.current_version_id = version.id
    await db_session.flush()

    service = PDFService(db_session)
    with pytest.raises(NotFound):
        await service.export_resume_pdf(resume.id, 2)


@pytest.mark.asyncio
async def test_cleanup_temp_files(db_session: AsyncSession):
    """清理临时目录"""
    service = PDFService(db_session)
    await service.cleanup_temp_files()
