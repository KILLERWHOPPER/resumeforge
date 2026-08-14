"""JWT Token 工具"""

from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import uuid4

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(user_id: int) -> str:
    """生成 Access Token（15分钟）"""
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "exp": expire,
        "jti": uuid4().hex,
        "type": "access",
    }
    return str(jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256"))


def create_refresh_token(user_id: int) -> str:
    """生成 Refresh Token（7天）"""
    expire = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "exp": expire,
        "jti": uuid4().hex,
        "type": "refresh",
    }
    return str(jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256"))


def decode_token(token: str) -> dict[str, Any] | None:
    """解码并验证 token"""
    try:
        return cast(dict[str, Any], jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"]))
    except JWTError:
        return None
