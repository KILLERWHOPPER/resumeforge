"""API v1 — 简历管理路由（使用 Service 层）"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.schemas.resume import ResumeContentUpdate, ResumeCreate, ResumeResponse
from app.services.resume_service import ResumeService

router = APIRouter()


@router.get("/", response_model=list[ResumeResponse])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """获取所有简历"""
    service = ResumeService(db)
    return await service.list_resumes(user_id)


@router.post("/", response_model=ResumeResponse, status_code=201)
async def create_resume(
    data: ResumeCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """创建新简历"""
    service = ResumeService(db)
    return await service.create_resume(user_id, data)


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """获取单个简历"""
    service = ResumeService(db)
    return await service.get_resume(resume_id, user_id)


@router.get("/{resume_id}/content")
async def get_resume_content(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """获取简历内容（ProseMirror JSON）"""
    service = ResumeService(db)
    return await service.get_resume_content(resume_id, user_id)


@router.put("/{resume_id}/content")
async def update_resume_content(
    resume_id: int,
    data: ResumeContentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """更新简历内容（带乐观锁）"""
    if_match = request.headers.get("If-Match")
    service = ResumeService(db)
    return await service.update_resume_content(resume_id, user_id, data, if_match)


@router.post("/{resume_id}/generate")
async def generate_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """AI 生成简历（SSE 流式）"""
    # 验证简历存在
    service = ResumeService(db)
    await service.get_resume(resume_id, user_id)

    # TODO: 实际的 LLM 调用和 SSE 流式返回
    async def event_stream():
        yield "event: status\ndata: 正在分析职位描述...\n\n"
        yield "event: status\ndata: 正在生成简历内容...\n\n"
        yield "event: complete\ndata: {}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """删除简历"""
    service = ResumeService(db)
    await service.delete_resume(resume_id, user_id)
    return None
