"""经历服务测试"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFound
from app.models.experience import Experience
from app.repositories.experience_repository import ExperienceRepository
from app.schemas.experience import EducationCreate, WorkCreate, ExperienceUpdate
from app.services.experience_service import ExperienceService


@pytest.mark.asyncio
async def test_create_experience(db_session: AsyncSession):
    """测试创建经历"""
    service = ExperienceService(db_session)
    data = EducationCreate(
        type="education",
        school="Test University",
        degree="Bachelor",
        field_of_study="CS",
    )
    experience = await service.create_experience(1, data)
    assert experience.id is not None
    assert experience.school == "Test University"
    assert experience.user_id == 1


@pytest.mark.asyncio
async def test_list_experiences(db_session: AsyncSession):
    """测试列出经历"""
    service = ExperienceService(db_session)
    repo = ExperienceRepository(db_session)

    # 创建几条经历
    await repo.create(user_id=1, type="education", school="Uni A", sort_order=0)
    await repo.create(user_id=1, type="work", company="Company B", sort_order=1)
    await repo.create(user_id=2, type="education", school="Uni C", sort_order=0)

    # 列出用户 1 的经历
    experiences = await service.list_experiences(1)
    assert len(experiences) == 2

    # 按类型筛选
    edu = await service.list_experiences(1, type_filter="education")
    assert len(edu) == 1


@pytest.mark.asyncio
async def test_get_experience_not_found(db_session: AsyncSession):
    """测试获取不存在的经历"""
    service = ExperienceService(db_session)
    with pytest.raises(NotFound):
        await service.get_experience(999, 1)


@pytest.mark.asyncio
async def test_get_experience_wrong_user(db_session: AsyncSession):
    """测试获取其他用户的经历"""
    service = ExperienceService(db_session)
    repo = ExperienceRepository(db_session)
    exp = await repo.create(user_id=2, type="education", school="Other User's")

    with pytest.raises(NotFound):
        await service.get_experience(exp.id, 1)


@pytest.mark.asyncio
async def test_update_experience(db_session: AsyncSession):
    """测试更新经历"""
    service = ExperienceService(db_session)
    repo = ExperienceRepository(db_session)

    exp = await repo.create(user_id=1, type="work", company="Old Corp")
    data = ExperienceUpdate(company="New Corp", position="Engineer")

    updated = await service.update_experience(exp.id, 1, data)
    assert updated.company == "New Corp"
    assert updated.position == "Engineer"


@pytest.mark.asyncio
async def test_delete_experience(db_session: AsyncSession):
    """测试删除经历"""
    service = ExperienceService(db_session)
    repo = ExperienceRepository(db_session)

    exp = await repo.create(user_id=1, type="skill", name="Python")
    await service.delete_experience(exp.id, 1)

    # 验证已删除
    result = await repo.get(exp.id)
    assert result is None


@pytest.mark.asyncio
async def test_reorder_experiences(db_session: AsyncSession):
    """测试排序更新"""
    service = ExperienceService(db_session)
    repo = ExperienceRepository(db_session)

    exp1 = await repo.create(user_id=1, type="education", school="A", sort_order=0)
    exp2 = await repo.create(user_id=1, type="work", company="B", sort_order=1)

    await service.reorder_experiences(1, [exp2.id, exp1.id])

    # 验证排序
    experiences = await service.list_experiences(1)
    assert experiences[0].id == exp2.id
    assert experiences[1].id == exp1.id
