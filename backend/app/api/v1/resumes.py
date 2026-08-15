"""API v1 — 简历管理路由（使用 Service 层）"""

import json
from collections.abc import AsyncIterator, Sequence
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.models.resume import Resume
from app.schemas.resume import (
    JDAnalysisResponse,
    ResumeContentUpdate,
    ResumeCreate,
    ResumeResponse,
    ResumeVersionDetail,
    ResumeVersionRestore,
    ResumeVersionSummary,
)
from app.services.ai_resume_service import AIResumeService
from app.services.pdf_service import PDFService
from app.services.resume_service import ResumeService

router = APIRouter()


@router.get("/", response_model=list[ResumeResponse])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Sequence[Resume]:
    """获取所有简历"""
    service = ResumeService(db)
    return await service.list_resumes(user_id)


@router.post("/", response_model=ResumeResponse, status_code=201)
async def create_resume(
    data: ResumeCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Resume:
    """创建新简历"""
    service = ResumeService(db)
    return await service.create_resume(user_id, data)


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Resume:
    """获取单个简历"""
    service = ResumeService(db)
    return await service.get_resume(resume_id, user_id)


@router.get("/{resume_id}/content")
async def get_resume_content(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> dict[str, Any]:
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
) -> dict[str, Any]:
    """更新简历内容（带乐观锁）"""
    if_match = request.headers.get("If-Match")
    service = ResumeService(db)
    return await service.update_resume_content(resume_id, user_id, data, if_match)


@router.post("/{resume_id}/analyze-jd", response_model=JDAnalysisResponse)
async def analyze_jd(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> JDAnalysisResponse:
    """AI 分析职位描述（结果缓存到 jd_analyses）"""
    service = AIResumeService(db)
    return await service.analyze_jd(resume_id, user_id)


@router.get("/{resume_id}/analysis", response_model=JDAnalysisResponse | None)
async def get_jd_analysis(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> JDAnalysisResponse | None:
    """获取已保存的 JD 分析结果"""
    service = AIResumeService(db)
    return await service.get_analysis(resume_id, user_id)


@router.post("/{resume_id}/generate")
async def generate_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> StreamingResponse:
    """AI 生成简历（SSE 流式，带并发生成锁）"""
    service = AIResumeService(db)

    async def event_stream() -> AsyncIterator[str]:
        try:
            async for item in service.generate_resume(resume_id, user_id):
                event = item["event"]
                payload = {k: v for k, v in item.items() if k != "event"}
                yield f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
        except Exception as exc:  # noqa: BLE001 — 需要把异常转成 SSE error 事件
            yield f"event: error\ndata: {json.dumps({'message': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{resume_id}/export-pdf")
async def export_resume_pdf(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Response:
    """导出简历为 PDF（ATS 单栏模板）"""
    service = PDFService(db)
    pdf_bytes = await service.export_resume_pdf(resume_id, user_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="resume-{resume_id}.pdf"'},
    )


@router.get("/{resume_id}/versions", response_model=list[ResumeVersionSummary])
async def list_resume_versions(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> list[dict[str, Any]]:
    """获取简历版本历史"""
    service = ResumeService(db)
    return await service.list_versions(resume_id, user_id)


@router.get("/{resume_id}/versions/{version_number}/content", response_model=ResumeVersionDetail)
async def get_resume_version_content(
    resume_id: int,
    version_number: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> dict[str, Any]:
    """获取指定版本的内容"""
    service = ResumeService(db)
    return await service.get_version_content(resume_id, version_number, user_id)


@router.post(
    "/{resume_id}/versions/{version_number}/restore", response_model=ResumeVersionRestore
)
async def restore_resume_version(
    resume_id: int,
    version_number: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> dict[str, Any]:
    """恢复指定版本为当前内容"""
    service = ResumeService(db)
    return await service.restore_version(resume_id, version_number, user_id)


@router.post("/{resume_id}/versions/{version_number}/branch", response_model=ResumeResponse, status_code=201)
async def branch_resume_version(
    resume_id: int,
    version_number: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Resume:
    """从指定版本派生一份新简历"""
    service = ResumeService(db)
    return await service.branch_resume(resume_id, version_number, user_id)


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> None:
    """删除简历"""
    service = ResumeService(db)
    await service.delete_resume(resume_id, user_id)
