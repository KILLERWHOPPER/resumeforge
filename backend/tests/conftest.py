"""测试配置与夹具"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.main import app
from app.services.ai_resume_service import AIResumeService

# 使用内存 SQLite 进行测试
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


class FakeLLM:
    """用于测试的假 LLM 客户端（不发起真实网络请求）"""

    def __init__(
        self,
        chat_result: str = '{"core_responsibilities": ["开发核心服务"], "required_skills": ["Python"], "preferred_skills": ["Docker"], "experience_level": "3-5年", "soft_skills": ["沟通"], "keywords": ["FastAPI"]}',
        stream_chunks: list[str] | None = None,
    ):
        self.chat_result = chat_result
        self.stream_chunks = stream_chunks or ['{"summary": "职业摘要", "sections": []}']

    async def chat(self, messages, *, temperature=0.7, max_tokens=None) -> str:
        return self.chat_result

    async def chat_stream(self, messages, *, temperature=0.7, max_tokens=None) -> AsyncGenerator[str, None]:
        for chunk in self.stream_chunks:
            yield chunk

    async def test_connection(self) -> None:
        return None


@pytest.fixture
def fake_llm(monkeypatch):
    """将 AIResumeService 的 LLM 客户端替换为 FakeLLM"""

    def _install(client: FakeLLM):
        async def _get_client(self, user_id):
            return client

        monkeypatch.setattr(AIResumeService, "_get_client", _get_client)
        return client

    return _install


@pytest.fixture(scope="session")
def event_loop():
    """每个会话使用同一个事件循环"""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """创建测试数据库会话"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[Any, None]:
    """创建测试 HTTP 客户端"""
    from httpx import ASGITransport, AsyncClient

    from app.core.dependencies import get_db

    # 注入测试 DB
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
