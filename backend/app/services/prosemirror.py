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


def build_user_header(user: dict[str, Any], target_language: str) -> list[PMNode]:
    """构建简历头部节点（姓名 + 联系方式），基于用户个人资料"""
    nodes: list[PMNode] = []

    name_zh = (user.get("name_zh") or "").strip()
    name_en = (user.get("name_en") or "").strip()
    if target_language == "chinese":
        display_name = name_zh or name_en
    elif target_language == "english":
        display_name = name_en or name_zh
    else:
        display_name = f"{name_zh}（{name_en}）" if name_zh and name_en else (name_zh or name_en)

    if display_name:
        nodes.append(heading(1, display_name))

    contact = user.get("contact_email") or user.get("email") or ""
    contact = contact.strip()
    parts = [p for p in [contact, user.get("phone"), user.get("address"), user.get("linkedin_url")] if p and p.strip()]
    contact_line = "  |  ".join(p.strip() for p in parts)
    if contact_line:
        nodes.append(paragraph(contact_line))

    return nodes


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
