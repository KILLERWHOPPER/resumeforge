"""API v1 — 简历管理路由"""
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.resume import Resume, ResumeVersion, JDAnalysis
from app.schemas.resume import ResumeContentUpdate, ResumeCreate, ResumeResponse

router = APIRouter()


def _get_current_user_id():
    return 1


@router.get("/", response_model=list[ResumeResponse])
async def list_resumes(db: AsyncSession = Depends(get_db)):
    """获取所有简历"""
    user_id = _get_current_user_id()
    result = await db.execute(
        select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=ResumeResponse, status_code=201)
async def create_resume(data: ResumeCreate, db: AsyncSession = Depends(get_db)):
    """创建新简历"""
    user_id = _get_current_user_id()
    resume = Resume(
        user_id=user_id,
        company_name=data.company_name,
        jd_text=data.jd_text,
        target_language=data.target_language,
    )
    db.add(resume)
    await db.flush()
    await db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: int, db: AsyncSession = Depends(get_db)):
    """获取单个简历"""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    return resume


@router.get("/{resume_id}/content")
async def get_resume_content(resume_id: int, db: AsyncSession = Depends(get_db)):
    """获取简历内容（ProseMirror JSON）"""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    if not resume.current_version_id:
        return {"content": None, "version": None}

    version_result = await db.execute(
        select(ResumeVersion).where(ResumeVersion.id == resume.current_version_id)
    )
    version = version_result.scalar_one_or_none()

    return {
        "content": version.content if version else None,
        "version": version.version_number if version else None,
    }


@router.put("/{resume_id}/content")
async def update_resume_content(
    resume_id: int,
    data: ResumeContentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """更新简历内容（带乐观锁）"""
    # 检查 If-Match 版本号
    if_match = request.headers.get("If-Match")
    if not if_match:
        raise HTTPException(status_code=400, detail="缺少 If-Match 头")

    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    # 验证版本号
    if resume.current_version_id:
        version_result = await db.execute(
            select(ResumeVersion).where(ResumeVersion.id == resume.current_version_id)
        )
        current_version = version_result.scalar_one_or_none()
        if current_version and str(current_version.version_number) != if_match:
            raise HTTPException(status_code=409, detail="内容已在其他地方更新，请刷新后重试")

    # 创建新版本
    new_version_number = (current_version.version_number + 1) if current_version else 1
    new_version = ResumeVersion(
        resume_id=resume_id,
        version_number=new_version_number,
        content=data.content,
    )
    db.add(new_version)
    await db.flush()

    resume.current_version_id = new_version.id
    await db.flush()

    return {"message": "保存成功", "version": new_version_number}


@router.post("/{resume_id}/generate")
async def generate_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
):
    """AI 生成简历（SSE 流式）"""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    # TODO: 实际的 LLM 调用和 SSE 流式返回
    async def event_stream():
        yield "event: status\ndata: 正在分析职位描述...\n\n"
        yield "event: status\ndata: 正在生成简历内容...\n\n"
        yield "event: complete\ndata: {}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(resume_id: int, db: AsyncSession = Depends(get_db)):
    """删除简历"""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    await db.delete(resume)
    return None
