"""API v1 — 认证路由（使用 Service 层）"""

# ruff: noqa: TRY003

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.core.exceptions import Unauthorized
from app.schemas.auth import (
    PasswordChange,
    PasswordForgot,
    TokenPair,
    TokenRefresh,
    UserLogin,
    UserProfileResponse,
    UserProfileUpdate,
    UserRegister,
    UserResponse,
)
from app.schemas.auth import (
    PasswordReset as PasswordResetSchema,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """注册新用户"""
    service = AuthService(db)
    return await service.register(data.email, data.password, data.confirm_password)


@router.post("/login", response_model=TokenPair)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    """用户登录"""
    service = AuthService(db)
    return await service.login(data.email, data.password)


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """获取当前用户个人资料"""
    service = AuthService(db)
    return await service.get_profile(user_id)


@router.put("/me", response_model=UserProfileResponse)
async def update_me(
    data: UserProfileUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """更新当前用户个人资料"""
    service = AuthService(db)
    return await service.update_profile(user_id, data)


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(
    data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    """刷新 Token"""
    service = AuthService(db)
    return await service.refresh_token(data.refresh_token)


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> None:
    """用户登出"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise Unauthorized("未提供 token")

    token = auth_header.split(" ", 1)[1]
    service = AuthService(db)
    await service.logout(token)


@router.post("/forgot-password", status_code=202)
async def forgot_password(
    data: PasswordForgot,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """忘记密码 — 发送重置链接"""
    service = AuthService(db)
    dev_token = await service.forgot_password(data.email)

    if dev_token:
        return {
            "message": "如果该邮箱已注册，重置链接已发送",
            "dev_token": dev_token,
        }
    return {"message": "如果该邮箱已注册，重置链接已发送"}


@router.post("/reset-password", status_code=200)
async def reset_password(
    data: PasswordResetSchema,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """重置密码"""
    service = AuthService(db)
    await service.reset_password(data.token, data.new_password)
    return {"message": "密码重置成功"}


@router.post("/change-password", status_code=200)
async def change_password(
    data: PasswordChange,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """修改密码（已登录状态）"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise Unauthorized("未提供 token")

    token = auth_header.split(" ", 1)[1]
    user_id = await get_current_user_id(request)

    service = AuthService(db)
    await service.change_password(user_id, data.current_password, data.new_password, token)
    return {"message": "密码修改成功，请重新登录"}
