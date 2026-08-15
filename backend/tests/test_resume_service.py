"""简历服务测试"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeContentUpdate, ResumeCreate
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


async def _seed_versions(db: AsyncSession, resume_id: int) -> None:
    """写入 v1/v2/v3 三个版本，当前指向 v3"""
    repo = ResumeRepository(db)
    resume = await repo.get(resume_id)
    for number, text in ((1, "v1"), (2, "v2"), (3, "v3")):
        version = await repo.create_version(resume_id, {"text": text}, number)
        resume.current_version_id = version.id
    await db.flush()


@pytest.mark.asyncio
async def test_list_versions(db_session: AsyncSession):
    """测试版本历史列表"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=1, company_name="Test")
    await _seed_versions(db_session, resume.id)

    versions = await service.list_versions(resume.id, 1)
    assert [v["version_number"] for v in versions] == [3, 2, 1]
    assert versions[0]["is_current"] is True
    assert versions[1]["is_current"] is False


@pytest.mark.asyncio
async def test_list_versions_wrong_user(db_session: AsyncSession):
    """测试他人简历版本历史"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=2, company_name="Other")
    with pytest.raises(NotFound):
        await service.list_versions(resume.id, 1)


@pytest.mark.asyncio
async def test_get_version_content(db_session: AsyncSession):
    """测试获取指定版本内容"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=1, company_name="Test")
    await _seed_versions(db_session, resume.id)

    detail = await service.get_version_content(resume.id, 1, 1)
    assert detail["content"]["text"] == "v1"

    with pytest.raises(NotFound):
        await service.get_version_content(resume.id, 99, 1)


@pytest.mark.asyncio
async def test_restore_version(db_session: AsyncSession):
    """测试恢复历史版本（历史不可变，新写版本）"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=1, company_name="Test")
    await _seed_versions(db_session, resume.id)

    result = await service.restore_version(resume.id, 1, 1)
    assert result["version"] == 4

    content = await service.get_resume_content(resume.id, 1)
    assert content["version"] == 4
    assert content["content"]["text"] == "v1"

    versions = await service.list_versions(resume.id, 1)
    assert versions[0]["is_current"] is True
    assert versions[0]["version_number"] == 4


@pytest.mark.asyncio
async def test_restore_missing_version(db_session: AsyncSession):
    """测试恢复不存在的版本"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=1, company_name="Test")
    with pytest.raises(NotFound):
        await service.restore_version(resume.id, 99, 1)


@pytest.mark.asyncio
async def test_branch_resume(db_session: AsyncSession):
    """测试从指定版本派生新简历"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(
        user_id=1,
        company_name="Acme",
        jd_text="JD text for a senior engineer role with backend experience",
        target_language="english",
    )
    await _seed_versions(db_session, resume.id)

    branch = await service.branch_resume(resume.id, 2, 1)
    assert branch.id != resume.id
    assert branch.company_name == "Acme"
    assert branch.target_language == "english"
    assert branch.status == "generated"

    content = await service.get_resume_content(branch.id, 1)
    assert content["version"] == 1
    assert content["content"]["text"] == "v2"


@pytest.mark.asyncio
async def test_branch_wrong_user(db_session: AsyncSession):
    """测试他人简历派生"""
    service = ResumeService(db_session)
    repo = ResumeRepository(db_session)
    resume = await repo.create(user_id=2, company_name="Other")
    with pytest.raises(NotFound):
        await service.branch_resume(resume.id, 1, 1)
