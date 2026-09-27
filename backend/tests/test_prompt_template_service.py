"""Prompt 模板服务测试"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.repositories.prompt_template_repository import PromptTemplateRepository
from app.services.prompt_template_service import PromptTemplateService


@pytest.mark.asyncio
async def test_render_system_falls_back_to_default(db_session: AsyncSession):
    """无数据库模板时回退内置默认模板"""
    service = PromptTemplateService(db_session)
    system = await service.render_system("jd_analysis", target_language="english")
    assert "招聘分析师" in system
    assert "english" in system
    # 默认模板中的 JSON 花括号应被正确保留
    assert '"core_responsibilities"' in system


@pytest.mark.asyncio
async def test_render_system_uses_custom_template(db_session: AsyncSession):
    """激活的自定义模板优先于内置默认"""
    service = PromptTemplateService(db_session)
    await service.create_version(
        key="jd_analysis",
        system_template="Custom JD system for {target_language}.",
        description="test",
        activate=True,
    )
    system = await service.render_system("jd_analysis", target_language="english")
    assert system == "Custom JD system for english."


@pytest.mark.asyncio
async def test_render_system_falls_back_on_bad_custom_template(db_session: AsyncSession):
    """自定义模板占位符错误时渲染回退默认模板（业务不中断）"""
    service = PromptTemplateService(db_session)

    # 绕过校验直接写一条坏模板
    repo = PromptTemplateRepository(db_session)
    await repo.create(
        key="jd_analysis",
        version=99,
        system_template="Broken {unknown_var} template",
        is_active=True,
    )
    system = await service.render_system("jd_analysis", target_language="english")
    assert "招聘分析师" in system


@pytest.mark.asyncio
async def test_create_version_versions_and_activates(db_session: AsyncSession):
    """创建版本：版本号递增，新版本激活时旧版本自动停用"""
    service = PromptTemplateService(db_session)
    v1 = await service.create_version("jd_analysis", "v1 {target_language}")
    v2 = await service.create_version("jd_analysis", "v2 {target_language}")

    assert v1.version == 1
    assert v2.version == 2
    assert v2.is_active is True

    versions = await service.list_versions("jd_analysis")
    active = [t for t in versions if t.is_active]
    assert len(active) == 1
    assert active[0].version == 2


@pytest.mark.asyncio
async def test_create_version_validates_placeholders(db_session: AsyncSession):
    """模板占位符校验：未知占位符与格式错误均拒绝"""
    service = PromptTemplateService(db_session)
    with pytest.raises(BadRequest, match="不支持的占位符"):
        await service.create_version("jd_analysis", "Bad {oops} template")
    with pytest.raises(BadRequest, match="渲染失败"):
        await service.create_version("jd_analysis", "Unbalanced { template")
    # 正常占位符可通过
    tpl = await service.create_version("jd_analysis", "OK {target_language}")
    assert tpl.version >= 1


@pytest.mark.asyncio
async def test_activate_specific_version(db_session: AsyncSession):
    """激活指定版本"""
    service = PromptTemplateService(db_session)
    await service.create_version("jd_analysis", "v1 {target_language}")
    v2 = await service.create_version("jd_analysis", "v2 {target_language}")

    activated = await service.activate("jd_analysis", 1)
    assert activated.version == 1
    assert activated.is_active is True

    versions = await service.list_versions("jd_analysis")
    active = [t for t in versions if t.is_active]
    assert len(active) == 1 and active[0].version == 1
    assert v2.is_active is False


@pytest.mark.asyncio
async def test_unknown_key_rejected(db_session: AsyncSession):
    """未知模板 key 抛 NotFound"""
    service = PromptTemplateService(db_session)
    with pytest.raises(NotFound):
        await service.render_system("no_such_key", target_language="x")
    with pytest.raises(NotFound):
        await service.create_version("no_such_key", "template")
