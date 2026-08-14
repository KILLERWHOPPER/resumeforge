"""LLM 服务抽象层 — 支持 OpenAI / DeepSeek / 智谱 GLM / OpenAI 兼容接口"""
# ruff: noqa: TRY003

from __future__ import annotations

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

    def _chat_url(self) -> str:
        return f"{self.base_url}/chat/completions"

    async def chat(
        self,
        messages: list[dict],
        *,
        temperature: float = 0.7,
    ) -> str:
        """非流式对话，返回模型回复文本"""
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport) as client:
                resp = await client.post(self._chat_url(), json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise BadRequest(f"无法连接 LLM 服务: {exc}") from exc

        if resp.is_error:
            raise BadRequest(f"LLM 请求失败 ({resp.status_code}): {resp.text[:200]}")

        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise BadRequest("LLM 响应格式异常") from exc

    async def test_connection(self) -> None:
        """测试连接：发送一次极短的对话请求"""
        await self.chat(
            [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "ping"},
            ],
            temperature=0,
        )
