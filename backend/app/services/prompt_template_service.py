"""Prompt 模板 Service — 模板渲染与版本管理，内置默认模板兜底"""

# ruff: noqa: TRY003

from __future__ import annotations

import string
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.prompt_template import PromptTemplate
from app.repositories.prompt_template_repository import PromptTemplateRepository
from app.services.prompts import (
    DEFAULT_JD_ANALYSIS_SYSTEM,
    DEFAULT_RESUME_GENERATION_SYSTEM,
    DEFAULT_RESUME_PARSE_SYSTEM,
)

# 支持的模板 key 及其占位符与内置默认值
TEMPLATE_REGISTRY: dict[str, dict[str, Any]] = {
    "jd_analysis": {
        "variables": ["target_language"],
        "default": DEFAULT_JD_ANALYSIS_SYSTEM,
    },
    "resume_generation": {
        "variables": ["target_language"],
        "default": DEFAULT_RESUME_GENERATION_SYSTEM,
    },
    "resume_parse": {
        "variables": ["lang_instruction"],
        "default": DEFAULT_RESUME_PARSE_SYSTEM,
    },
}


class PromptTemplateService:
    """Prompt 模板服务：数据库自定义模板优先，缺失时回退内置默认模板"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PromptTemplateRepository(db)

    async def render_system(self, key: str, **variables: Any) -> str:
        """渲染系统提示词：优先数据库激活版本，渲染失败或无记录时回退默认模板"""
        if key not in TEMPLATE_REGISTRY:
            raise NotFound(f"未知的 Prompt 模板 key: {key}")

        template = await self.repo.get_active(key)
        if template:
            try:
                return template.system_template.format(**variables)
            except (KeyError, IndexError, ValueError):
                # 自定义模板占位符错误时回退内置默认，保证业务不中断
                pass
        return TEMPLATE_REGISTRY[key]["default"].format(**variables)

    async def list_versions(self, key: str) -> list[PromptTemplate]:
        """列出某 key 的所有模板版本"""
        if key not in TEMPLATE_REGISTRY:
            raise NotFound(f"未知的 Prompt 模板 key: {key}")
        return list(await self.repo.list_by_key(key))

    async def create_version(
        self,
        key: str,
        system_template: str,
        description: str | None = None,
        activate: bool = True,
    ) -> PromptTemplate:
        """创建新版本模板，可选激活（激活时自动停用旧版本）"""
        if key not in TEMPLATE_REGISTRY:
            raise NotFound(f"未知的 Prompt 模板 key: {key}")
        self._validate_template(key, system_template)

        version = await self.repo.get_max_version(key) + 1
        if activate:
            await self.repo.deactivate_all(key)
        return await self.repo.create(
            key=key,
            version=version,
            system_template=system_template,
            description=description,
            is_active=activate,
        )

    async def activate(self, key: str, version: int) -> PromptTemplate:
        """激活指定版本"""
        result = await self.repo.list_by_key(key)
        target = next((t for t in result if t.version == version), None)
        if not target:
            raise NotFound(f"模板 {key} v{version} 不存在")
        await self.repo.deactivate_all(key)
        target.is_active = True
        await self.db.flush()
        return target

    def _validate_template(self, key: str, system_template: str) -> None:
        """校验模板：占位符必须是注册表中声明的子集，且可正常渲染"""
        try:
            fields = {
                fname
                for _, fname, _, _ in string.Formatter().parse(system_template)
                if fname is not None
            }
        except ValueError as exc:
            raise BadRequest(f"模板渲染失败（占位符格式错误）: {exc}") from exc
        allowed = set(TEMPLATE_REGISTRY[key]["variables"])
        unknown = fields - allowed
        if unknown:
            raise BadRequest(
                f"模板包含不支持的占位符: {', '.join(sorted(unknown))}，"
                f"允许的占位符: {', '.join(sorted(allowed))}"
            )
        # 用示例变量试渲染
        try:
            system_template.format(**dict.fromkeys(allowed, "x"))
        except (KeyError, IndexError, ValueError) as exc:
            raise BadRequest(f"模板渲染失败（占位符格式错误）: {exc}") from exc
