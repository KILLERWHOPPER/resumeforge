"""LLM 客户端测试（使用 MockTransport 隔离网络）"""

from __future__ import annotations

import json

import httpx
import pytest

from app.core.config import settings
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


def sse_response(chunks: list[dict]) -> httpx.Response:
    """构造 SSE 流式响应"""
    lines = "".join(f"data: {json.dumps(c)}\n\n" for c in chunks)
    return httpx.Response(
        200,
        text=lines + "data: [DONE]\n\n",
        headers={"content-type": "text/event-stream"},
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
    result = await client.chat([{"role": "user", "content": "hi"}])
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


@pytest.mark.asyncio
async def test_chat_stream_yields_content():
    """流式对话按块产出 content（忽略 reasoning_content）"""

    def handler(request: httpx.Request) -> httpx.Response:
        return sse_response(
            [
                {"choices": [{"delta": {"reasoning_content": "思考中"}}]},
                {"choices": [{"delta": {"content": "你"}}]},
                {"choices": [{"delta": {"content": "好"}}]},
            ]
        )

    client = make_client(handler)
    result = []
    async for chunk in client.chat_stream([{"role": "user", "content": "hi"}]):
        result.append(chunk)
    assert "".join(result) == "你好"


@pytest.mark.asyncio
async def test_chat_stream_error_status():
    """流式请求上游 4xx 时抛 BadRequest"""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, text="rate limited")

    client = make_client(handler)
    with pytest.raises(BadRequest, match="LLM 请求失败"):
        async for _ in client.chat_stream([{"role": "user", "content": "hi"}]):
            pass


@pytest.mark.asyncio
async def test_opencode_anon_client_headers():
    """OpenCode 匿名客户端注入认证与标识头"""
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(request.headers)
        return ok_handler(request)

    transport = httpx.MockTransport(handler)
    client = LLMClient.for_opencode_anon(
        model_name="deepseek-v4-flash-free",
        timeout=5,
        transport=transport,
    )
    await client.chat([{"role": "user", "content": "hi"}])

    assert captured["authorization"] == "Bearer public"
    assert captured["x-opencode-client"] == "cli"
    assert captured["x-opencode-request"].startswith("msg_")
    assert captured["x-opencode-session"].startswith("ses_")
    assert client.model_name == settings.OPENCODE_ANON_MODEL


@pytest.mark.asyncio
async def test_opencode_anon_stream():
    """OpenCode 匿名客户端流式请求"""

    def handler(request: httpx.Request) -> httpx.Response:
        return sse_response([{"choices": [{"delta": {"content": "free-model-ok"}}]}])

    transport = httpx.MockTransport(handler)
    client = LLMClient.for_opencode_anon(timeout=5, transport=transport)
    parts = []
    async for chunk in client.chat_stream([{"role": "user", "content": "hi"}]):
        parts.append(chunk)
    assert "".join(parts) == "free-model-ok"
