"""API v1 — 经历管理路由（使用 Service 层）"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.schemas.experience import (
    CertificateCreate,
    EducationCreate,
    ExperienceResponse,
    ExperienceUpdate,
    ProjectCreate,
    SkillCreate,
    WorkCreate,
)
from app.services.experience_service import ExperienceService

router = APIRouter()


@router.get("/", response_model=list[ExperienceResponse])
async def list_experiences(
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """获取所有经历"""
    service = ExperienceService(db)
    return await service.list_experiences(user_id, type)


@router.post("/", response_model=ExperienceResponse, status_code=201)
async def create_experience(
    data: EducationCreate | WorkCreate | ProjectCreate | SkillCreate | CertificateCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """创建新经历"""
    service = ExperienceService(db)
    return await service.create_experience(user_id, data)


@router.get("/{experience_id}", response_model=ExperienceResponse)
async def get_experience(
    experience_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """获取单条经历"""
    service = ExperienceService(db)
    return await service.get_experience(experience_id, user_id)


@router.put("/{experience_id}", response_model=ExperienceResponse)
async def update_experience(
    experience_id: int,
    data: ExperienceUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """更新经历"""
    service = ExperienceService(db)
    return await service.update_experience(experience_id, user_id, data)


@router.delete("/{experience_id}", status_code=204)
async def delete_experience(
    experience_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """删除经历"""
    service = ExperienceService(db)
    await service.delete_experience(experience_id, user_id)
    return None


@router.put("/reorder", status_code=200)
async def reorder_experiences(
    order: list[int],
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """批量更新排序"""
    service = ExperienceService(db)
    await service.reorder_experiences(user_id, order)
    return {"message": "排序更新成功"}
