"""Pydantic Schemas — 简历"""
from pydantic import BaseModel, Field


class ResumeCreate(BaseModel):
    company_name: str = Field(max_length=300)
    jd_text: str
    target_language: str = Field(default="english", pattern="^(chinese|english|bilingual)$")


class ResumeResponse(BaseModel):
    id: int
    company_name: str | None = None
    target_language: str
    status: str
    created_at: str

    class Config:
        from_attributes = True


class ResumeContentUpdate(BaseModel):
    content: dict  # ProseMirror JSON


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
