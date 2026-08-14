"""API v1 — 经历管理路由（使用 Service 层）"""

from collections.abc import Sequence
from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.core.exceptions import BadRequest
from app.models.experience import Experience
from app.schemas.experience import (
    CertificateCreate,
    EducationCreate,
    ExperienceImportResponse,
    ExperienceReorder,
    ExperienceResponse,
    ExperienceUpdate,
    ProjectCreate,
    SkillCreate,
    WorkCreate,
)
from app.services.experience_service import ExperienceService
from app.services.resume_import_service import ResumeImportService

router = APIRouter()


@router.get("/", response_model=list[ExperienceResponse])
async def list_experiences(
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Sequence[Experience]:
    """获取所有经历"""
    service = ExperienceService(db)
    return await service.list_experiences(user_id, type)


@router.get("/aggregate", response_model=None)
async def aggregate_experiences(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> dict[str, Any]:
    """获取所有经历（按类型分组）"""
    service = ExperienceService(db)
    return await service.aggregate(user_id)


@router.post("/", response_model=ExperienceResponse, status_code=201)
async def create_experience(
    data: EducationCreate | WorkCreate | ProjectCreate | SkillCreate | CertificateCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Experience:
    """创建新经历"""
    service = ExperienceService(db)
    return await service.create_experience(user_id, data)


@router.post("/import", response_model=ExperienceImportResponse, status_code=201)
async def import_resume(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> ExperienceImportResponse:
    """上传简历并自动识别添加经历（支持 PDF / DOCX / TXT）"""
    content = await file.read()
    if not content:
        raise BadRequest("文件内容为空")

    service = ResumeImportService(db)
    return await service.import_resume(
        user_id=user_id,
        filename=file.filename or "resume.txt",
        content=content,
        language=language,
    )


@router.put("/reorder", status_code=200)
async def reorder_experiences(
    data: ExperienceReorder,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> dict[str, str]:
    """批量更新排序"""
    service = ExperienceService(db)
    await service.reorder_experiences(user_id, data.order)
    return {"message": "排序更新成功"}


@router.get("/{experience_id}", response_model=ExperienceResponse)
async def get_experience(
    experience_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Experience:
    """获取单条经历"""
    service = ExperienceService(db)
    return await service.get_experience(experience_id, user_id)


@router.put("/{experience_id}", response_model=ExperienceResponse)
async def update_experience(
    experience_id: int,
    data: ExperienceUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Experience:
    """更新经历"""
    service = ExperienceService(db)
    return await service.update_experience(experience_id, user_id, data)


@router.delete("/{experience_id}", status_code=204)
async def delete_experience(
    experience_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> None:
    """删除经历"""
    service = ExperienceService(db)
    await service.delete_experience(experience_id, user_id)
