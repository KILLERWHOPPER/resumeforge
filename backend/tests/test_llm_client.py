"""LLM 客户端测试（使用 MockTransport 隔离网络）"""

from __future__ import annotations

import httpx
import pytest

from app.core.exceptions import BadRequest
from app.services.llm_client import LLMClient


def make_client(handler) -> LLMClient:
    transport = httpx.MockTransport(handler)
    return LLMClient(
        base_url="https://api.example.com/v1",
        api_key="sk-test",
        model_name="test-model",
        timeout=5,
        transport=transport,
    )


def ok_handler(request: httpx.Request) -> httpx.Response:
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": "你好，我是 AI"}}]},
    )


@pytest.mark.asyncio
async def test_chat_success():
    """对话成功返回内容"""
    client = make_client(ok_handler)
    result = await client.chat(
        [{"role": "user", "content": "hi"}]
    )
    assert result == "你好，我是 AI"


@pytest.mark.asyncio
async def test_chat_error_status():
    """上游返回 4xx 时抛 BadRequest"""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "bad key"})

    client = make_client(handler)
    with pytest.raises(BadRequest, match="LLM 请求失败"):
        await client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_chat_network_error():
    """网络错误时抛 BadRequest"""

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    client = make_client(handler)
    with pytest.raises(BadRequest, match="无法连接"):
        await client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_chat_malformed_response():
    """响应格式异常时抛 BadRequest"""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected": "shape"})

    client = make_client(handler)
    with pytest.raises(BadRequest, match="响应格式异常"):
        await client.chat([{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_test_connection_success():
    """连接测试成功不抛错"""
    client = make_client(ok_handler)
    await client.test_connection()


@pytest.mark.asyncio
async def test_chat_url_uses_base_url():
    """请求路径拼接正确"""
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(str(request.url))
        return ok_handler(request)

    client = make_client(handler)
    await client.chat([{"role": "user", "content": "hi"}])
    assert captured[0] == "https://api.example.com/v1/chat/completions"
