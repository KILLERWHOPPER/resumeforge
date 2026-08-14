"""简历导入服务与解析器测试（mock LLM，不发起真实网络请求）"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest
from app.services.resume_import_service import ResumeImportService
from app.services.resume_parser import extract_resume_text

from .conftest import FakeLLM

RESUME_TXT = (
    "张三\n软件工程师\n"
    "教育经历：清华大学，计算机科学与技术，2018.09 - 2022.06\n"
    "工作经历：字节跳动，后端工程师，2022.07 至今，负责核心服务开发与性能优化\n"
    "项目经历：ResumeForge，全栈开发，使用 FastAPI、Next.js，AI 简历生成工具\n"
    "技能：Python（精通）、Docker（熟练）\n"
    "证书：CET-6，教育部颁发\n"
)

EXTRACTION_JSON = """{
  "education": [{"school": "清华大学", "degree": "本科", "field_of_study": "计算机", "start_date": "2018-09", "end_date": "2022-06"}],
  "work": [{"company": "字节跳动", "position": "后端工程师", "start_date": "2022-07", "end_date": "present", "description": "负责核心服务开发与性能优化"}],
  "project": [{"name": "ResumeForge", "role": "全栈", "tech_tags": ["FastAPI", "Next.js", ""], "url": "", "description": "AI 简历生成工具"}],
  "skill": [{"name": "Python", "category": "语言", "proficiency": "advanced"}, {"name": "Docker", "category": "工具", "proficiency": "熟练"}],
  "certificate": [{"name": "CET-6", "issuer": "教育部"}],
  "extra": "ignored"
}"""


@pytest.mark.asyncio
async def test_import_resume_success(db_session: AsyncSession, monkeypatch):
    """TXT 简历导入：LLM 抽取并批量落库"""

    async def _get_client(self, user_id):
        return FakeLLM(chat_result=EXTRACTION_JSON)

    monkeypatch.setattr(ResumeImportService, "_get_client", _get_client)

    service = ResumeImportService(db_session)
    result = await service.import_resume(1, "resume.txt", RESUME_TXT.encode("utf-8"))

    assert result.added_count == 6
    assert result.by_type == {
        "education": 1,
        "work": 1,
        "project": 1,
        "skill": 2,
        "certificate": 1,
    }
    assert result.experiences["education"][0].school == "清华大学"
    assert result.experiences["work"][0].position == "后端工程师"
    # advanced / 熟练 → expert / intermediate
    proficiencies = {e.name: e.proficiency for e in result.experiences["skill"]}
    assert proficiencies["Python"] == "expert"
    assert proficiencies["Docker"] == "intermediate"
    # 空字符串与空 tech_tag 被过滤
    assert result.experiences["project"][0].url is None
    assert result.experiences["project"][0].tech_tags == ["FastAPI", "Next.js"]

    # 落库后可查询
    rows = await service.experience_repo.list_by_user(1)
    assert len(rows) == 6


@pytest.mark.asyncio
async def test_import_resume_llm_empty(db_session: AsyncSession, monkeypatch):
    """LLM 未识别到任何经历时抛错"""

    async def _get_client(self, user_id):
        return FakeLLM(
            chat_result='{"education": [], "work": [], "project": [], "skill": [], "certificate": []}'
        )

    monkeypatch.setattr(ResumeImportService, "_get_client", _get_client)

    service = ResumeImportService(db_session)
    with pytest.raises(BadRequest, match="未从简历中识别"):
        await service.import_resume(1, "resume.txt", RESUME_TXT.encode("utf-8"))


@pytest.mark.asyncio
async def test_import_resume_malformed_llm(db_session: AsyncSession, monkeypatch):
    """LLM 返回非 JSON 时抛错"""

    async def _get_client(self, user_id):
        return FakeLLM(chat_result="not json")

    monkeypatch.setattr(ResumeImportService, "_get_client", _get_client)

    service = ResumeImportService(db_session)
    with pytest.raises(BadRequest, match="无法解析为 JSON"):
        await service.import_resume(1, "resume.txt", RESUME_TXT.encode("utf-8"))


@pytest.mark.asyncio
async def test_import_resume_skips_invalid_items(db_session: AsyncSession, monkeypatch):
    """清洗：缺少关键字段的条目被跳过，proficiency 非法值被丢弃"""

    async def _get_client(self, user_id):
        return FakeLLM(
            chat_result=(
                '{"work": [{"company": "", "position": "工程师"}, '
                '{"company": "腾讯", "position": "前端", "start_date": null}], '
                '"skill": [{"name": "Go", "category": "语言", "proficiency": "unknown"}], '
                '"education": "not-a-list", "project": [], "certificate": []}'
            )
        )

    monkeypatch.setattr(ResumeImportService, "_get_client", _get_client)

    service = ResumeImportService(db_session)
    result = await service.import_resume(1, "resume.txt", RESUME_TXT.encode("utf-8"))

    assert result.by_type["work"] == 1
    assert result.by_type["skill"] == 1  # proficiency 非法值被丢弃，但技能本身保留
    assert result.experiences["skill"][0].proficiency is None
    assert result.by_type["education"] == 0  # 非列表 → 跳过


def test_extract_resume_text_txt():
    """TXT 文本提取"""
    text = extract_resume_text("resume.txt", RESUME_TXT.encode("utf-8"))
    assert "清华大学" in text
    assert len(text) >= 50


def test_extract_resume_text_rejects_unsupported():
    """不支持的扩展名抛错"""
    with pytest.raises(BadRequest, match="仅支持"):
        extract_resume_text("resume.exe", b"content")


def test_extract_resume_text_too_short():
    """文字过少抛错"""
    with pytest.raises(BadRequest, match="未能从文件"):
        extract_resume_text("resume.txt", b"hi")


def test_extract_resume_text_pdf_docx_invalid():
    """损坏的 PDF/DOCX 抛错"""
    with pytest.raises(BadRequest, match="PDF"):
        extract_resume_text("resume.pdf", b"not a pdf")
    with pytest.raises(BadRequest, match="DOCX"):
        extract_resume_text("resume.docx", b"not a docx")
