"""用户 Repository"""

from __future__ import annotations

from sqlalchemy import select

from app.core.exceptions import Conflict, NotFound
from app.models.user import User, TokenBlacklist, PasswordReset
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """用户 Repository"""

    def __init__(self, db):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> User | None:
        """根据邮箱查找用户"""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_email_or_404(self, email: str) -> User:
        """根据邮箱查找用户，不存在则抛出异常"""
        user = await self.get_by_email(email)
        if not user:
            raise NotFound("用户不存在")
        return user

    async def ensure_email_unique(self, email: str) -> None:
        """确保邮箱唯一"""
        existing = await self.get_by_email(email)
        if existing:
            raise Conflict("邮箱已被注册")

    # ---- Token 黑名单 ----

    async def blacklist_token(self, jti: str, user_id: int, expires_at) -> None:
        """将 JWT 加入黑名单"""
        entry = TokenBlacklist(jti=jti, user_id=user_id, expires_at=expires_at)
        self.db.add(entry)
        await self.db.flush()

    async def is_token_blacklisted(self, jti: str) -> bool:
        """检查 JWT 是否已被吊销"""
        result = await self.db.execute(
            select(TokenBlacklist).where(TokenBlacklist.jti == jti)
        )
        return result.scalar_one_or_none() is not None

    # ---- 密码重置 ----

    async def create_password_reset(self, user_id: int, token_hash: str, expires_at) -> PasswordReset:
        """创建密码重置记录"""
        reset = PasswordReset(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(reset)
        await self.db.flush()
        return reset

    async def get_password_reset(self, token_hash: str) -> PasswordReset | None:
        """获取有效的密码重置记录"""
        from datetime import datetime, timezone

        result = await self.db.execute(
            select(PasswordReset).where(
                PasswordReset.token_hash == token_hash,
                PasswordReset.used == False,
            )
        )
        reset = result.scalar_one_or_none()
        if reset:
            expires = reset.expires_at
            now = datetime.now(timezone.utc)
            # 兼容 timezone-aware 和 timezone-naive 的比较（SQLite 可能丢失 tz）
            if expires.tzinfo is None:
                now = now.replace(tzinfo=None)
            if expires < now:
                return None
        return reset
