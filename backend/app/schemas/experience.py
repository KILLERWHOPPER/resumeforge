"""Pydantic Schemas — 经历"""
from pydantic import BaseModel, Field


class ExperienceBase(BaseModel):
    type: str = Field(pattern="^(education|work|project|skill|certificate)$")
    sort_order: int = 0
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None


class EducationCreate(ExperienceBase):
    type: str = "education"
    school: str = Field(max_length=300)
    degree: str | None = Field(default=None, max_length=100)
    field_of_study: str | None = Field(default=None, max_length=200)
    gpa: str | None = None


class WorkCreate(ExperienceBase):
    type: str = "work"
    company: str = Field(max_length=300)
    position: str = Field(max_length=200)


class ProjectCreate(ExperienceBase):
    type: str = "project"
    name: str = Field(max_length=300)
    role: str | None = Field(default=None, max_length=200)
    tech_tags: list[str] = Field(default_factory=list, max_length=20)
    url: str | None = None


class SkillCreate(ExperienceBase):
    type: str = "skill"
    name: str = Field(max_length=200)
    category: str | None = Field(default=None, max_length=100)
    proficiency: str | None = Field(default=None, pattern="^(beginner|intermediate|expert)$")


class CertificateCreate(ExperienceBase):
    type: str = "certificate"
    name: str = Field(max_length=200)
    issuer: str | None = Field(default=None, max_length=200)
    credential_url: str | None = None


class ExperienceResponse(BaseModel):
    id: int
    type: str
    sort_order: int
    # 通用字段
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    # 教育
    school: str | None = None
    degree: str | None = None
    field_of_study: str | None = None
    gpa: str | None = None
    # 工作
    company: str | None = None
    position: str | None = None
    # 项目
    role: str | None = None
    tech_tags: list[str] | None = None
    url: str | None = None
    # 技能
    name: str | None = None
    category: str | None = None
    proficiency: str | None = None
    # 证书
    issuer: str | None = None
    credential_url: str | None = None

    class Config:
        from_attributes = True


class ExperienceUpdate(BaseModel):
    sort_order: int | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    school: str | None = None
    degree: str | None = None
    field_of_study: str | None = None
    gpa: str | None = None
    company: str | None = None
    position: str | None = None
    role: str | None = None
    tech_tags: list[str] | None = None
    url: str | None = None
    name: str | None = None
    category: str | None = None
    proficiency: str | None = None
    issuer: str | None = None
    credential_url: str | None = None
