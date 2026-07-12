"""认证服务 — 注册、登录、token 刷新、密码重置"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from passlib.hash import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Unauthorized
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenPair, UserResponse


class AuthService:
    """认证服务"""

    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def register(self, email: str, password: str, confirm_password: str) -> UserResponse:
        """注册新用户"""
        if password != confirm_password:
            raise BadRequest("密码不一致")

        await self.repo.ensure_email_unique(email)

        user = await self.repo.create(
            email=email,
            password_hash=bcrypt.hash(password),
        )
        return UserResponse(
            id=user.id,
            email=user.email,
            created_at=user.created_at.isoformat(),
        )

    async def login(self, email: str, password: str) -> TokenPair:
        """用户登录"""
        user = await self.repo.get_by_email(email)
        if not user or not bcrypt.verify(password, user.password_hash):
            raise Unauthorized("邮箱或密码错误")

        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def refresh_token(self, refresh_token: str) -> TokenPair:
        """刷新 Token"""
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise Unauthorized("无效的 refresh token")

        user_id = int(payload["sub"])
        jti = payload.get("jti")

        # 检查黑名单
        if jti:
            blacklisted = await self.repo.is_token_blacklisted(jti)
            if blacklisted:
                raise Unauthorized("Token 已被吊销")

        # 将旧 refresh token 加入黑名单
        if jti:
            expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            await self.repo.blacklist_token(jti, user_id, expires_at)

        return TokenPair(
            access_token=create_access_token(user_id),
            refresh_token=create_refresh_token(user_id),
        )

    async def logout(self, token: str) -> None:
        """用户登出 — 将 token 加入黑名单"""
        payload = decode_token(token)
        if not payload:
            raise Unauthorized("无效的 token")

        jti = payload.get("jti")
        user_id = int(payload["sub"])
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        if jti:
            await self.repo.blacklist_token(jti, user_id, expires_at)

    async def forgot_password(self, email: str) -> str | None:
        """忘记密码 — 返回 dev_token（Phase 1）"""
        user = await self.repo.get_by_email(email)
        if not user:
            return None

        token_raw = hashlib.sha256(
            f"{user.id}:{datetime.now(timezone.utc)}".encode()
        ).hexdigest()
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        await self.repo.create_password_reset(user.id, token_hash, expires_at)
        return token_raw

    async def reset_password(self, token: str, new_password: str) -> None:
        """重置密码"""
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        reset = await self.repo.get_password_reset(token_hash)
        if not reset:
            raise BadRequest("重置链接无效或已过期")

        user = await self.repo.get_or_404(reset.user_id)
        user.password_hash = bcrypt.hash(new_password)
        reset.used = True
        await self.repo.db.flush()

    async def change_password(
        self,
        user_id: int,
        current_password: str,
        new_password: str,
        token: str,
    ) -> None:
        """修改密码（已登录状态）"""
        user = await self.repo.get_or_404(user_id)
        if not bcrypt.verify(current_password, user.password_hash):
            raise BadRequest("当前密码错误")

        user.password_hash = bcrypt.hash(new_password)

        # 将当前 token 加入黑名单（强制重新登录）
        payload = decode_token(token)
        if payload:
            jti = payload.get("jti")
            if jti:
                expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
                await self.repo.blacklist_token(jti, user_id, expires_at)
