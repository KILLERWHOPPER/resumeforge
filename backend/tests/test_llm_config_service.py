"""LLM 配置服务测试"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFound
from app.schemas.resume import LLMConfigCreate
from app.services.llm_config_service import LLMConfigService


@pytest.mark.asyncio
async def test_create_llm_config(db_session: AsyncSession):
    """测试创建 LLM 配置"""
    service = LLMConfigService(db_session)
    data = LLMConfigCreate(
        name="GPT-4o",
        base_url="https://api.openai.com/v1",
        api_key="sk-test123456789",
        model_name="gpt-4o",
    )
    result = await service.create_config(1, data)
    assert result.id is not None
    assert result.name == "GPT-4o"
    assert result.api_key_masked is not None
    assert result.api_key_masked.startswith("sk-test")


@pytest.mark.asyncio
async def test_list_configs(db_session: AsyncSession):
    """测试列出配置"""
    service = LLMConfigService(db_session)
    data = LLMConfigCreate(
        name="DeepSeek",
        base_url="https://api.deepseek.com",
        api_key="sk-ds-test123",
        model_name="deepseek-chat",
    )
    await service.create_config(1, data)
    await service.create_config(1, LLMConfigCreate(
        name="GPT-4o",
        base_url="https://api.openai.com",
        api_key="sk-456",
        model_name="gpt-4o",
    ))

    configs = await service.list_configs(1)
    assert len(configs) == 2


@pytest.mark.asyncio
async def test_activate_config(db_session: AsyncSession):
    """测试激活配置"""
    service = LLMConfigService(db_session)
    data1 = LLMConfigCreate(
        name="Config A",
        base_url="https://api.a.com",
        api_key="sk-a",
        model_name="model-a",
    )
    data2 = LLMConfigCreate(
        name="Config B",
        base_url="https://api.b.com",
        api_key="sk-b",
        model_name="model-b",
    )
    c1 = await service.create_config(1, data1)
    await service.create_config(1, data2)

    # 激活 Config A
    result = await service.activate_config(c1.id, 1)
    assert "已激活" in result["message"]

    # 验证只有 Config A 处于激活状态
    configs = await service.list_configs(1)
    active = [c for c in configs if c.is_active]
    assert len(active) == 1
    assert active[0].name == "Config A"


@pytest.mark.asyncio
async def test_activate_config_not_found(db_session: AsyncSession):
    """测试激活不存在的配置"""
    service = LLMConfigService(db_session)
    with pytest.raises(NotFound):
        await service.activate_config(999, 1)


@pytest.mark.asyncio
async def test_delete_config(db_session: AsyncSession):
    """测试删除配置"""
    service = LLMConfigService(db_session)
    data = LLMConfigCreate(
        name="To Delete",
        base_url="https://api.delete.com",
        api_key="sk-del",
        model_name="del-model",
    )
    result = await service.create_config(1, data)

    await service.delete_config(result.id, 1)

    configs = await service.list_configs(1)
    assert len(configs) == 0


@pytest.mark.asyncio
async def test_delete_config_not_found(db_session: AsyncSession):
    """测试删除不存在的配置"""
    service = LLMConfigService(db_session)
    with pytest.raises(NotFound):
        await service.delete_config(999, 1)


@pytest.mark.asyncio
async def test_get_active_config(db_session: AsyncSession):
    """测试获取已激活配置"""
    service = LLMConfigService(db_session)
    data = LLMConfigCreate(
        name="Active Config",
        base_url="https://api.active.com",
        api_key="sk-active",
        model_name="active-model",
        is_active=True,
    )
    await service.create_config(1, data)

    active = await service.get_active_config(1)
    assert active is not None
    assert active.name == "Active Config"


@pytest.mark.asyncio
async def test_get_active_config_none(db_session: AsyncSession):
    """测试无激活配置时返回 None"""
    service = LLMConfigService(db_session)
    active = await service.get_active_config(1)
    assert active is None
