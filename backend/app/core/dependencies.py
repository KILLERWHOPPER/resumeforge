"""FastAPI 依赖注入"""

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db as _get_db
from app.core.exceptions import Unauthorized
from app.core.security import decode_token
from app.models.user import User


async def get_db() -> AsyncSession:
    """获取数据库会话"""
    async for session in _get_db():
        yield session


async def get_current_user_id(request: Request) -> int:
    """从 JWT 中解析当前用户 ID"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise Unauthorized("未提供 token")

    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise Unauthorized("无效的 token")

    return int(payload["sub"])
