"""LLM 服务抽象层 — 支持 OpenAI / DeepSeek / 智谱 GLM / OpenAI 兼容接口 / OpenCode Zen"""
# ruff: noqa: TRY003

from __future__ import annotations

import json
from typing import AsyncIterator
from uuid import uuid4

import httpx

from app.core.config import settings
from app.core.exceptions import BadRequest


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
    def for_opencode_anon(cls, model_name: str | None = None, **kwargs) -> "LLMClient":
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
        messages: list[dict],
        *,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> str:
        """非流式对话，返回模型回复文本"""
        payload: dict = {
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

    async def chat_stream(
        self,
        messages: list[dict],
        *,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """流式对话，逐个产出 content 文本块（忽略 reasoning_content）"""
        payload: dict = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        try:
            async with self._client() as client, client.stream(
                "POST",
                self._chat_url(),
                json=payload,
                headers=self._build_headers(),
            ) as resp:
                if resp.is_error:
                    body = await resp.aread()
                    raise BadRequest(
                        f"LLM 请求失败 ({resp.status_code}): {body[:200]}"
                    )
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[len("data:"):].strip()
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
