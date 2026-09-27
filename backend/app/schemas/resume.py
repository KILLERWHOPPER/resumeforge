"""Pydantic Schemas — 简历"""
# ruff: noqa: TRY003

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator

from app.core.exceptions import BadRequest


class ResumeCreate(BaseModel):
    company_name: str | None = Field(default=None, max_length=300)
    jd_text: str
    target_language: str = Field(default="english", pattern="^(chinese|english|bilingual)$")


class ResumeResponse(BaseModel):
    id: int
    company_name: str | None = None
    target_language: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeContentUpdate(BaseModel):
    content: dict[str, Any]  # ProseMirror JSON


class ResumeVersionSummary(BaseModel):
    version_number: int
    created_at: datetime
    is_current: bool


class ResumeVersionDetail(BaseModel):
    version_number: int
    created_at: datetime
    content: dict[str, Any]  # ProseMirror JSON


class ResumeVersionRestore(BaseModel):
    message: str
    version: int


class JDAnalysisResponse(BaseModel):
    resume_id: int
    core_responsibilities: list[str]
    required_skills: list[str]
    preferred_skills: list[str]
    experience_level: str
    soft_skills: list[str]
    keywords: list[str]
    created_at: datetime


class JDAnalysisData(BaseModel):
    """JD 分析结果的深度校验模型（LLM 输出 → 结构化数据）"""

    model_config = {"str_strip_whitespace": True}

    core_responsibilities: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    experience_level: str = ""
    soft_skills: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)

    @field_validator("core_responsibilities", "required_skills", "preferred_skills", "soft_skills", "keywords", mode="before")
    @classmethod
    def _coerce_str_list(cls, value: Any) -> list[str]:
        """容忍 LLM 输出：标量转单元素列表，丢弃 None，元素统一转字符串"""
        if value is None:
            return []
        if isinstance(value, str):
            return [value] if value.strip() else []
        if isinstance(value, (list, tuple)):
            return [str(item).strip() for item in value if item is not None and str(item).strip()]
        return [str(value).strip()] if str(value).strip() else []

    @field_validator("experience_level", mode="before")
    @classmethod
    def _coerce_str(cls, value: Any) -> str:
        if value is None:
            return ""
        return str(value).strip()


def validate_jd_analysis(raw: dict[str, Any]) -> dict[str, Any]:
    """深度校验 LLM 返回的 JD 分析结果：缺字段报错，字段值做清洗归一"""
    if not isinstance(raw, dict):
        raise BadRequest("JD 分析结果必须是 JSON 对象")
    missing = [k for k in JDAnalysisData.model_fields if k not in raw]
    if missing:
        raise BadRequest(f"JD 分析结果缺少字段: {', '.join(missing)}")
    try:
        return JDAnalysisData.model_validate(raw).model_dump()
    except ValidationError as exc:
        details = "; ".join(
            f"{'.'.join(str(p) for p in e.get('loc', []))}: {e.get('msg', '')}"
            for e in exc.errors()[:3]
        )
        raise BadRequest(f"JD 分析结果字段格式错误: {details}") from exc


class PromptTemplateResponse(BaseModel):
    id: int
    key: str
    version: int
    system_template: str
    is_active: bool
    description: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class PromptTemplateCreate(BaseModel):
    system_template: str
    description: str | None = Field(default=None, max_length=300)
    activate: bool = True


class PromptTemplateActivate(BaseModel):
    version: int


class LLMConfigCreate(BaseModel):
    name: str = Field(max_length=100)
    base_url: str = Field(max_length=500)
    api_key: str
    model_name: str = Field(max_length=200)
    is_active: bool = False


class LLMConfigResponse(BaseModel):
    id: int
    name: str
    base_url: str
    model_name: str
    is_active: bool
    api_key_masked: str | None = None  # 脱敏后的 key

    class Config:
        from_attributes = True


class LLMConfigTest(BaseModel):
    base_url: str = Field(max_length=500)
    api_key: str
    model_name: str = Field(max_length=200)
