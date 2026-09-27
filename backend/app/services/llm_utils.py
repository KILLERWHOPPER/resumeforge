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

    # 尝试修复被截断的 JSON：丢弃最后一个不完整的元素后补全括号
    repaired = _repair_truncated_json(stripped)
    if repaired is not None:
        try:
            parsed = json.loads(repaired)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    raise BadRequest("AI 返回内容无法解析为 JSON，请重试")


def _repair_truncated_json(text: str) -> str | None:  # noqa: PLR0912
    """修复被截断的 JSON 文本：补齐未闭合的括号，尽量保留已生成内容。

    两种策略依次尝试：
    1. 直接在末尾补全括号（处理字符串已闭合、括号未闭合的情况）
    2. 截断到最后一个安全的值边界后再补全（处理字符串/键值对未写完的情况）
    全部失败返回 None。
    """
    # 去掉代码块围栏前缀，定位 JSON 起始
    start = text.find("{")
    if start == -1:
        return None
    body = text[start:]

    stack: list[str] = []
    in_string = False
    escaped = False
    last_safe_end = -1  # 最后一个"值边界"位置（逗号/闭合括号之后）

    for i, ch in enumerate(body):
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch in "{[":
            stack.append(ch)
        elif ch in "}]":
            if stack:
                stack.pop()
            else:
                return None  # 多余的闭合括号，放弃修复
        if ch in ",}]" and stack:
            last_safe_end = i

    if not stack:
        return None  # JSON 已完整或括号不平衡，交给上层处理

    closing = "".join("}" if c == "{" else "]" for c in reversed(stack))

    candidates = [
        # 策略 1：去掉尾随残片（如悬挂的逗号、冒号）后直接补全括号
        body.rstrip().rstrip(",").rstrip(":") + closing,
    ]
    if last_safe_end >= 0:
        cut = body[: last_safe_end + 1].rstrip().rstrip(",")
        if cut:
            # 策略 2：截到最后一个安全边界（可处理引号/键值对写了一半的情况）
            candidates.append(cut + closing)

    for candidate in candidates:
        try:
            json.loads(candidate)
        except json.JSONDecodeError:
            continue
        return candidate
    return None
