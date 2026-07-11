"""API v1 — 经历管理路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.experience import Experience
from app.schemas.experience import (
    CertificateCreate, EducationCreate, ExperienceResponse, ExperienceUpdate,
    ProjectCreate, SkillCreate, WorkCreate,
)

router = APIRouter()


# 所有经历类型的创建 schema
CREATE_SCHEMAS = {
    "education": EducationCreate,
    "work": WorkCreate,
    "project": ProjectCreate,
    "skill": SkillCreate,
    "certificate": CertificateCreate,
}


def _get_current_user_id():
    """临时用户 ID 获取（后续替换为 JWT 验证）"""
    return 1


@router.get("/", response_model=list[ExperienceResponse])
async def list_experiences(
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """获取所有经历"""
    user_id = _get_current_user_id()
    query = select(Experience).where(Experience.user_id == user_id)
    if type:
        query = query.where(Experience.type == type)
    query = query.order_by(Experience.sort_order)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ExperienceResponse, status_code=201)
async def create_experience(data: EducationCreate | WorkCreate | ProjectCreate | SkillCreate | CertificateCreate, db: AsyncSession = Depends(get_db)):
    """创建新经历"""
    user_id = _get_current_user_id()
    experience_data = data.model_dump()
    experience_type = experience_data.pop("type")

    experience = Experience(
        user_id=user_id,
        type=experience_type,
        **{k: v for k, v in experience_data.items() if v is not None},
    )
    db.add(experience)
    await db.flush()
    await db.refresh(experience)
    return experience


@router.get("/{experience_id}", response_model=ExperienceResponse)
async def get_experience(experience_id: int, db: AsyncSession = Depends(get_db)):
    """获取单条经历"""
    result = await db.execute(
        select(Experience).where(Experience.id == experience_id)
    )
    experience = result.scalar_one_or_none()
    if not experience:
        raise HTTPException(status_code=404, detail="经历不存在")
    return experience


@router.put("/{experience_id}", response_model=ExperienceResponse)
async def update_experience(
    experience_id: int,
    data: ExperienceUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新经历"""
    result = await db.execute(
        select(Experience).where(Experience.id == experience_id)
    )
    experience = result.scalar_one_or_none()
    if not experience:
        raise HTTPException(status_code=404, detail="经历不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(experience, key, value)

    await db.flush()
    await db.refresh(experience)
    return experience


@router.delete("/{experience_id}", status_code=204)
async def delete_experience(experience_id: int, db: AsyncSession = Depends(get_db)):
    """删除经历"""
    result = await db.execute(
        select(Experience).where(Experience.id == experience_id)
    )
    experience = result.scalar_one_or_none()
    if not experience:
        raise HTTPException(status_code=404, detail="经历不存在")

    await db.delete(experience)
    return None


@router.put("/reorder", status_code=200)
async def reorder_experiences(
    order: list[int],
    db: AsyncSession = Depends(get_db),
):
    """批量更新排序"""
    user_id = _get_current_user_id()
    for idx, exp_id in enumerate(order):
        result = await db.execute(
            select(Experience).where(
                Experience.id == exp_id,
                Experience.user_id == user_id,
            )
        )
        experience = result.scalar_one_or_none()
        if experience:
            experience.sort_order = idx

    return {"message": "排序更新成功"}
