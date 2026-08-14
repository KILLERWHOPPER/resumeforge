"""AI 简历生成服务测试（mock LLM，不发起真实网络请求）"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequest, Conflict
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeCreate
from app.services.ai_resume_service import AIResumeService
from app.services.llm_utils import extract_json

from .conftest import FakeLLM

JD_TEXT = (
    "We are hiring a Python backend developer to build scalable APIs for our "
    "platform using FastAPI, PostgreSQL, Docker and AWS. You will design and "
    "implement microservices, optimize database performance and collaborate "
    "with frontend teams. 3+ years of experience required."
)


async def create_resume(db: AsyncSession, user_id: int = 1) -> int:
    service = AIResumeService(db)
    data = ResumeCreate(
        company_name="Acme Corp",
        jd_text=JD_TEXT,
        target_language="english",
    )
    resume = await service.resume_service.create_resume(user_id, data)
    return resume.id


@pytest.mark.asyncio
async def test_analyze_jd_success(db_session: AsyncSession, fake_llm):
    """JD 分析成功并保存"""
    resume_id = await create_resume(db_session)
    fake_llm(FakeLLM())

    service = AIResumeService(db_session)
    result = await service.analyze_jd(resume_id, 1)

    assert result.resume_id == resume_id
    assert result.core_responsibilities == ["开发核心服务"]
    assert result.required_skills == ["Python"]

    saved = await service.resume_repo.get_jd_analysis(resume_id)
    assert saved is not None
    assert saved.analysis["keywords"] == ["FastAPI"]


@pytest.mark.asyncio
async def test_analyze_jd_too_short(db_session: AsyncSession, fake_llm):
    """JD 过短报错"""
    resume_id = await create_resume(db_session)
    resume = await ResumeRepository(db_session).get(resume_id)
    resume.jd_text = "short jd"
    await db_session.flush()
    fake_llm(FakeLLM())

    service = AIResumeService(db_session)
    with pytest.raises(BadRequest, match="职位描述过短"):
        await service.analyze_jd(resume_id, 1)


@pytest.mark.asyncio
async def test_analyze_jd_malformed_output(db_session: AsyncSession, fake_llm):
    """LLM 返回不可解析内容时抛错"""
    resume_id = await create_resume(db_session)
    fake_llm(FakeLLM(chat_result="not a json at all"))

    service = AIResumeService(db_session)
    with pytest.raises(BadRequest, match="无法解析为 JSON"):
        await service.analyze_jd(resume_id, 1)


@pytest.mark.asyncio
async def test_generate_resume_success(db_session: AsyncSession, fake_llm):
    """生成简历：SSE 事件流 + 版本落库 + 状态更新"""
    resume_id = await create_resume(db_session)
    fake_llm(
        FakeLLM(
            stream_chunks=[
                '{"summary": "Summary text", "sections": [{"type": "work", "title": "工作经历", "items": [{"heading": "职位 · 公司", "bullets": ["成就1"]}]}]}'
            ]
        )
    )

    service = AIResumeService(db_session)
    events = []
    async for item in service.generate_resume(resume_id, 1):
        events.append(item)

    events_by_type = {e["event"]: e for e in events}
    assert "complete" in events_by_type
    assert events_by_type["complete"]["version"] == 1
    assert any(e["event"] == "chunk" for e in events)

    resume = await service.resume_service.get_resume(resume_id, 1)
    assert resume.status == "generated"
    assert resume.current_version_id is not None

    content = await service.resume_service.get_resume_content(resume_id, 1)
    assert content["version"] == 1
    assert content["content"]["type"] == "doc"


@pytest.mark.asyncio
async def test_generate_resume_reuses_analysis(db_session: AsyncSession, fake_llm):
    """已有 JD 分析时生成直接复用，不重复分析"""
    resume_id = await create_resume(db_session)
    fake_llm(FakeLLM(stream_chunks=['{"summary": "s", "sections": []}']))

    service = AIResumeService(db_session)
    await service.analyze_jd(resume_id, 1)

    events = [e async for e in service.generate_resume(resume_id, 1)]
    assert not any(e["event"] == "status" and e["stage"] == "analyzing" for e in events)


@pytest.mark.asyncio
async def test_generate_resume_concurrency_lock(db_session: AsyncSession, fake_llm):
    """并发生成锁：状态为 generating 时拒绝再次生成"""
    resume_id = await create_resume(db_session)
    fake_llm(FakeLLM(stream_chunks=["x"] * 0 + ['{"summary": "s", "sections": []}']))

    service = AIResumeService(db_session)
    resume = await service.resume_service.get_resume(resume_id, 1)
    resume.status = "generating"
    await db_session.flush()

    with pytest.raises(Conflict, match="正在生成中"):
        async for _ in service.generate_resume(resume_id, 1):
            pass


@pytest.mark.asyncio
async def test_generate_resume_error_event(db_session: AsyncSession, fake_llm):
    """生成过程中异常时发出 error 事件并置状态为 failed"""
    resume_id = await create_resume(db_session)

    class BrokenLLM:
        async def chat(self, messages, *, temperature=0.7, max_tokens=None):
            return ""

        async def chat_stream(self, messages, *, temperature=0.7, max_tokens=None):
            yield "bad output"
            raise RuntimeError("boom")

    fake_llm(BrokenLLM())

    service = AIResumeService(db_session)
    events = [e async for e in service.generate_resume(resume_id, 1)]

    assert events[-1]["event"] == "error"
    resume = await service.resume_service.get_resume(resume_id, 1)
    assert resume.status == "failed"


@pytest.mark.asyncio
async def test_get_effective_provider_default(db_session: AsyncSession):
    """未配置时生效提供方为 OpenCode 匿名免费模型"""
    service = AIResumeService(db_session)
    provider = await service.get_effective_provider(1)
    assert provider["source"] == "opencode_free"
    assert provider["model_name"] == settings.OPENCODE_ANON_MODEL


@pytest.mark.asyncio
async def test_extract_json_helpers():
    """JSON 提取工具：容忍代码块与多余文字"""
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert extract_json('前言 {"a": 2} 后记') == {"a": 2}
    with pytest.raises(BadRequest):
        extract_json("nothing here")
