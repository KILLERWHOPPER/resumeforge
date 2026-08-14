"""ProseMirror JSON 构建器 — 将结构化简历内容转换为编辑器文档"""

from __future__ import annotations

from typing import Any

PMNode = dict[str, Any]


def text_node(text: str) -> PMNode:
    return {"type": "text", "text": text}


def paragraph(text: str | None) -> PMNode | None:
    if not text or not text.strip():
        return None
    return {"type": "paragraph", "content": [text_node(text.strip())]}


def heading(level: int, text: str | None) -> PMNode | None:
    if not text or not text.strip():
        return None
    return {
        "type": "heading",
        "attrs": {"level": level},
        "content": [text_node(text.strip())],
    }


def bullet_list(bullets: list[str]) -> PMNode | None:
    items: list[PMNode] = []
    for bullet in bullets or []:
        if not bullet or not bullet.strip():
            continue
        items.append(
            {
                "type": "listItem",
                "content": [paragraph(bullet)],
            }
        )
    if not items:
        return None
    return {"type": "bulletList", "content": items}


def build_prose_mirror(content: PMNode) -> PMNode:
    """构建标准 ProseMirror 文档（doc -> paragraph/heading/bulletList）"""
    doc: PMNode = {"type": "doc", "content": []}

    summary = paragraph(content.get("summary"))
    if summary:
        doc["content"].append(summary)

    for section in content.get("sections", []) or []:
        title = section.get("title")
        section_heading = heading(2, title)
        if section_heading:
            doc["content"].append(section_heading)

        for item in section.get("items", []) or []:
            item_heading = heading(3, item.get("heading"))
            if item_heading:
                doc["content"].append(item_heading)
            bullet = bullet_list(item.get("bullets", []))
            if bullet:
                doc["content"].append(bullet)

    return doc
