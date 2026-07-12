"""用户服务"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserResponse


class UserService:
    """用户服务"""

    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def get_user_profile(self, user_id: int) -> UserResponse:
        """获取用户资料"""
        user = await self.repo.get_or_404(user_id)
        return UserResponse(
            id=user.id,
            email=user.email,
            created_at=user.created_at.isoformat(),
        )
