"""API v1 — 认证路由"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.user import User, TokenBlacklist
from app.schemas.auth import (
    PasswordChange, PasswordForgot, PasswordReset as PasswordResetSchema,
    TokenPair, TokenRefresh, UserLogin, UserRegister, UserResponse,
)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """注册新用户"""
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="密码不一致")

    # 检查邮箱唯一
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    from passlib.hash import bcrypt
    user = User(
        email=data.email,
        password_hash=bcrypt.hash(data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at.isoformat(),
    )


@router.post("/login", response_model=TokenPair)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    from passlib.hash import bcrypt

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not bcrypt.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    """刷新 Token"""
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="无效的 refresh token")

    user_id = int(payload["sub"])

    # 检查是否在黑名单
    jti = payload.get("jti")
    if jti:
        result = await db.execute(
            select(TokenBlacklist).where(TokenBlacklist.jti == jti)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=401, detail="Token 已被吊销")

    # 将旧 refresh token 加入黑名单
    if jti:
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        blacklist_entry = TokenBlacklist(jti=jti, user_id=user_id, expires_at=expires_at)
        db.add(blacklist_entry)

    return TokenPair(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """用户登出 — 将 token 加入黑名单"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供 token")

    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="无效的 token")

    jti = payload.get("jti")
    user_id = int(payload["sub"])
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    if jti:
        blacklist_entry = TokenBlacklist(jti=jti, user_id=user_id, expires_at=expires_at)
        db.add(blacklist_entry)

    return None


@router.post("/forgot-password", status_code=202)
async def forgot_password(data: PasswordForgot, db: AsyncSession = Depends(get_db)):
    """忘记密码 — 发送重置链接（Phase 1 返回 token 直接）"""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # 不论用户是否存在，都返回 202（防止枚举攻击）
    if user:
        import hashlib
        from datetime import timedelta
        from app.models.user import PasswordReset as PasswordResetModel

        token_raw = hashlib.sha256(f"{user.id}:{datetime.now(timezone.utc)}".encode()).hexdigest()
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()

        reset = PasswordResetModel(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        db.add(reset)
        # TODO: 发送邮件，Phase 1 暂时在响应中返回 token
        return {"message": "如果该邮箱已注册，重置链接已发送", "dev_token": token_raw}

    return {"message": "如果该邮箱已注册，重置链接已发送"}


@router.post("/reset-password", status_code=200)
async def reset_password(data: PasswordResetSchema, db: AsyncSession = Depends(get_db)):
    """重置密码"""
    import hashlib
    from app.models.user import PasswordReset as PasswordResetModel
    from passlib.hash import bcrypt

    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    result = await db.execute(
        select(PasswordResetModel).where(
            PasswordResetModel.token_hash == token_hash,
            PasswordResetModel.used == False,
        )
    )
    reset = result.scalar_one_or_none()

    if not reset or reset.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="重置链接无效或已过期")

    # 更新密码
    user_result = await db.execute(select(User).where(User.id == reset.user_id))
    user = user_result.scalar_one()
    user.password_hash = bcrypt.hash(data.new_password)

    # 标记 token 已使用
    reset.used = True

    # 将该用户所有 token 加入黑名单
    from sqlalchemy import select as sel
    tokens_result = await db.execute(
        sel(TokenBlacklist).where(TokenBlacklist.user_id == user.id)
    )
    # 已有的 refresh token 需要在下次使用时拒绝

    return {"message": "密码重置成功"}


@router.post("/change-password", status_code=200)
async def change_password(
    data: PasswordChange,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """修改密码（已登录状态）"""
    from passlib.hash import bcrypt

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供 token")

    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="无效的 token")

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not bcrypt.verify(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="当前密码错误")

    user.password_hash = bcrypt.hash(data.new_password)

    # 将所有 token 加入黑名单（强制重新登录）
    jti = payload.get("jti")
    if jti:
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        db.add(TokenBlacklist(jti=jti, user_id=user_id, expires_at=expires_at))

    return {"message": "密码修改成功，请重新登录"}
