"""认证服务测试"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Unauthorized
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_register_success(db_session: AsyncSession):
    """测试注册成功"""
    service = AuthService(db_session)
    result = await service.register(
        email="test@example.com",
        password="password123",
        confirm_password="password123",
    )
    assert result.email == "test@example.com"
    assert result.id is not None


@pytest.mark.asyncio
async def test_register_password_mismatch(db_session: AsyncSession):
    """测试密码不一致"""
    service = AuthService(db_session)
    with pytest.raises(BadRequest, match="密码不一致"):
        await service.register(
            email="test@example.com",
            password="password123",
            confirm_password="different",
        )


@pytest.mark.asyncio
async def test_register_duplicate_email(db_session: AsyncSession):
    """测试重复邮箱注册"""
    service = AuthService(db_session)
    await service.register(
        email="dupe@example.com",
        password="password123",
        confirm_password="password123",
    )
    with pytest.raises(Exception):  # Conflict
        await service.register(
            email="dupe@example.com",
            password="password456",
            confirm_password="password456",
        )


@pytest.mark.asyncio
async def test_login_success(db_session: AsyncSession):
    """测试登录成功"""
    # 先注册
    auth_service = AuthService(db_session)
    await auth_service.register(
        email="login@example.com",
        password="password123",
        confirm_password="password123",
    )

    # 登录
    result = await auth_service.login(
        email="login@example.com",
        password="password123",
    )
    assert result.access_token is not None
    assert result.refresh_token is not None
    assert result.token_type == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(db_session: AsyncSession):
    """测试密码错误"""
    service = AuthService(db_session)
    await service.register(
        email="wrongpw@example.com",
        password="password123",
        confirm_password="password123",
    )

    with pytest.raises(Unauthorized, match="邮箱或密码错误"):
        await service.login(
            email="wrongpw@example.com",
            password="wrongpassword",
        )


@pytest.mark.asyncio
async def test_login_user_not_found(db_session: AsyncSession):
    """测试用户不存在"""
    service = AuthService(db_session)
    with pytest.raises(Unauthorized, match="邮箱或密码错误"):
        await service.login(
            email="nonexistent@example.com",
            password="password123",
        )


@pytest.mark.asyncio
async def test_forgot_password(db_session: AsyncSession):
    """测试忘记密码"""
    # 先注册
    service = AuthService(db_session)
    await service.register(
        email="forgot@example.com",
        password="password123",
        confirm_password="password123",
    )

    # 忘记密码
    token = await service.forgot_password("forgot@example.com")
    assert token is not None


@pytest.mark.asyncio
async def test_forgot_password_nonexistent_user(db_session: AsyncSession):
    """测试不存在的用户忘记密码"""
    service = AuthService(db_session)
    token = await service.forgot_password("nobody@example.com")
    assert token is None


@pytest.mark.asyncio
async def test_reset_password(db_session: AsyncSession):
    """测试密码重置"""
    service = AuthService(db_session)
    await service.register(
        email="reset@example.com",
        password="oldpassword",
        confirm_password="oldpassword",
    )

    # 获取重置 token
    token = await service.forgot_password("reset@example.com")
    assert token is not None

    # 重置密码
    await service.reset_password(token, "newpassword123")

    # 用新密码登录
    result = await service.login("reset@example.com", "newpassword123")
    assert result.access_token is not None
