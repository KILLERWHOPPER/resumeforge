"""LLM 结构化输出解析工具"""
# ruff: noqa: TRY003

from __future__ import annotations

import json
import re
from typing import Any

from app.core.exceptions import BadRequest


def extract_json(text: str) -> dict[str, Any]:
    """从模型回复中提取 JSON 对象（容忍 Markdown 代码块与多余文字）"""
    if not text or not text.strip():
        raise BadRequest("AI 返回内容为空")

    stripped = text.strip()
    # 去掉 Markdown 代码块围栏
    stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
    stripped = re.sub(r"\s*```$", "", stripped)

    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # 尝试提取第一个 {...} 块
    match = re.search(r"\{.*\}", stripped, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    raise BadRequest("AI 返回内容无法解析为 JSON，请重试")
