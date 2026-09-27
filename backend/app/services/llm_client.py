"""LLM 服务抽象层 — 支持 OpenAI / DeepSeek / 智谱 GLM / OpenAI 兼容接口 / OpenCode Zen"""
# ruff: noqa: TRY003

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

import httpx

from app.core.config import settings
from app.core.exceptions import BadRequest
from app.services.llm_utils import extract_json


class LLMClient:
    """统一的 OpenAI 兼容 LLM 客户端"""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model_name: str,
        timeout: int | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model_name = model_name
        self.timeout = timeout or settings.LLM_REQUEST_TIMEOUT
        self.transport = transport
        self.extra_headers: dict[str, str] = {}

    @classmethod
    def for_opencode_anon(cls, model_name: str | None = None, **kwargs: Any) -> LLMClient:
        """OpenCode Zen 匿名免费模型（无需 API Key，使用 Bearer public + 标识头）"""
        client = cls(
            base_url=settings.OPENCODE_ANON_BASE_URL,
            api_key=settings.OPENCODE_ANON_API_KEY,
            model_name=model_name or settings.OPENCODE_ANON_MODEL,
            **kwargs,
        )
        client.extra_headers = {
            "User-Agent": "opencode/1.15.0 ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.13",
            "x-opencode-client": "cli",
            "x-opencode-project": "global",
            "x-opencode-request": f"msg_{uuid4().hex}",
            "x-opencode-session": f"ses_{uuid4().hex}",
        }
        return client

    def _chat_url(self) -> str:
        return f"{self.base_url}/chat/completions"

    def _build_headers(self) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self.api_key}"}
        headers.update(self.extra_headers)
        return headers

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=self.timeout, transport=self.transport)

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> str:
        """非流式对话，返回模型回复文本"""
        payload: dict[str, Any] = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        try:
            async with self._client() as client:
                resp = await client.post(
                    self._chat_url(), json=payload, headers=self._build_headers()
                )
        except httpx.HTTPError as exc:
            raise BadRequest(f"无法连接 LLM 服务: {exc}") from exc

        if resp.is_error:
            raise BadRequest(f"LLM 请求失败 ({resp.status_code}): {resp.text[:200]}")

        data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise BadRequest("LLM 响应格式异常") from exc
        return content or ""

    async def chat_json(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        max_retries: int = 1,
    ) -> dict[str, Any]:
        """对话并解析 JSON 输出，失败时携带上一轮错误上下文自动重试。

        适用于要求模型只输出 JSON 对象的场景。每轮重试会把模型上一次的
        输出与修复指令追加到对话中，引导其输出完整合法的 JSON。
        """
        convo = list(messages)
        last_error: Exception | None = None
        for _ in range(max_retries + 1):
            raw = await self.chat(convo, temperature=temperature, max_tokens=max_tokens)
            try:
                return extract_json(raw)
            except BadRequest as exc:
                last_error = exc
                convo = convo + [
                    {"role": "assistant", "content": raw[:2000]},
                    {
                        "role": "user",
                        "content": (
                            "你上一次的输出无法解析为 JSON（可能被截断或包含多余文字）。"
                            "请重新输出完整且合法的一个 JSON 对象，"
                            "不要输出任何其他文字或 Markdown 代码块。"
                        ),
                    },
                ]
        raise BadRequest(
            f"AI 返回内容无法解析为 JSON（已重试 {max_retries} 次）"
        ) from last_error

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """流式对话，逐个产出 content 文本块（忽略 reasoning_content）"""
        payload: dict[str, Any] = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        try:
            async with (
                self._client() as client,
                client.stream(
                    "POST",
                    self._chat_url(),
                    json=payload,
                    headers=self._build_headers(),
                ) as resp,
            ):
                if resp.is_error:
                    body = await resp.aread()
                    raise BadRequest(
                        f"LLM 请求失败 ({resp.status_code}): {body[:200].decode(errors='replace')}"
                    )
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[len("data:") :].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    choices = chunk.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    content = delta.get("content")
                    if content:
                        yield content
        except httpx.HTTPError as exc:
            raise BadRequest(f"无法连接 LLM 服务: {exc}") from exc

    async def test_connection(self) -> None:
        """测试连接：发送一次极短的对话请求"""
        await self.chat(
            [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "ping"},
            ],
            temperature=0,
            max_tokens=8,
        )
