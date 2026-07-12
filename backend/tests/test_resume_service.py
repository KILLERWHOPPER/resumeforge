"""简历服务测试"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeCreate, ResumeContentUpdate
from app.services.resume_service import ResumeService


@pytest.mark.asyncio
async def test_create_resume(db_session: AsyncSession):
    """测试创建简历"""
    service = ResumeService(db_session)
    data = ResumeCreate(
        company_name="Test Corp",
        jd_text="Looking for a Python developer...",
        target_language="english",
    )
    resume = await service.create_resume(1, data)
    assert resume.id is not None
    assert resume.company_name == "Test Corp"
    assert resume.status == "draft"


@pytest.mark.asyncio
async def test_list_resumes(db_session: AsyncSession):
    """测试列出简历"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)

    await repo.create(user_id=1, company_name="Corp A")
    await repo.create(user_id=1, company_name="Corp B")
    await repo.create(user_id=2, company_name="Corp C")

    resumes = await service.list_resumes(1)
    assert len(resumes) == 2


@pytest.mark.asyncio
async def test_get_resume_not_found(db_session: AsyncSession):
    """测试获取不存在的简历"""
    service = ResumeService(db_session)
    with pytest.raises(NotFound):
        await service.get_resume(999, 1)


@pytest.mark.asyncio
async def test_get_resume_wrong_user(db_session: AsyncSession):
    """测试获取其他用户的简历"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=2, company_name="Other User's")

    with pytest.raises(NotFound):
        await service.get_resume(resume.id, 1)


@pytest.mark.asyncio
async def test_delete_resume(db_session: AsyncSession):
    """测试删除简历"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)

    resume = await repo.create(user_id=1, company_name="To Delete")
    await service.delete_resume(resume.id, 1)

    result = await repo.get(resume.id)
    assert result is None


@pytest.mark.asyncio
async def test_update_resume_content_requires_if_match(db_session: AsyncSession):
    """测试更新内容需要 If-Match 头"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=1, company_name="Test")

    # 创建初始版本
    version = await repo.create_version(resume.id, {"text": "v1"}, 1)
    resume.current_version_id = version.id
    await db_session.flush()

    update = ResumeContentUpdate(content={"text": "v2"})

    with pytest.raises(BadRequest, match="缺少 If-Match 头"):
        await service.update_resume_content(resume.id, 1, update, if_match=None)


@pytest.mark.asyncio
async def test_update_resume_content_version_conflict(db_session: AsyncSession):
    """测试版本冲突"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=1, company_name="Test")

    version = await repo.create_version(resume.id, {"text": "v1"}, 1)
    resume.current_version_id = version.id
    await db_session.flush()

    update = ResumeContentUpdate(content={"text": "v2"})

    with pytest.raises(BadRequest, match="内容已在其他地方更新"):
        await service.update_resume_content(resume.id, 1, update, if_match="2")


@pytest.mark.asyncio
async def test_update_resume_content_success(db_session: AsyncSession):
    """测试更新内容成功"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=1, company_name="Test")

    version = await repo.create_version(resume.id, {"text": "v1"}, 1)
    resume.current_version_id = version.id
    await db_session.flush()

    update = ResumeContentUpdate(content={"text": "v2"})
    result = await service.update_resume_content(resume.id, 1, update, if_match="1")

    assert result["version"] == 2

    # 验证新版本
    content = await service.get_resume_content(resume.id, 1)
    assert content["version"] == 2
    assert content["content"]["text"] == "v2"
