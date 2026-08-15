"""ResumeForge FastAPI 应用入口"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import auth, experiences, llm_configs, resumes
from app.core.config import settings
from app.core.exceptions import AppError

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """应用生命周期：启动和关闭"""
    # 启动时可以做初始化
    yield
    # 关闭时清理资源


app = FastAPI(
    title="ResumeForge API",
    description="结构化简历生成工具 — 后端 API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由挂载
app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(experiences.router, prefix="/api/v1/experiences", tags=["经历管理"])
app.include_router(resumes.router, prefix="/api/v1/resumes", tags=["简历"])
app.include_router(llm_configs.router, prefix="/api/v1/llm-configs", tags=["LLM 配置"])


# 全局异常处理：将业务异常映射为对应 HTTP 状态码
@app.exception_handler(AppError)
async def app_exception_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    """健康检查端点"""
    return {"status": "ok", "service": "resumeforge-api"}
