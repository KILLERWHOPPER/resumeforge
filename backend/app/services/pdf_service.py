"""PDF 导出服务 — 将 ProseMirror JSON 渲染为 ATS 友好的单栏 PDF"""

from __future__ import annotations

from html import escape
from pathlib import Path
from typing import Any, cast

from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.core.config import settings
from app.core.exceptions import BadRequest, NotFound
from app.repositories.resume_repository import ResumeRepository

# ATS 单栏模板 CSS：清爽排版、无图片/分栏，便于 ATS 解析
PDF_STYLE = """
@page {
  size: A4;
  margin: 18mm 16mm 16mm 16mm;
}
* { box-sizing: border-box; }
body {
  font-family: "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #1f2937;
  margin: 0;
  padding: 0;
}
.resume { max-width: 100%; }
h1 {
  font-size: 22pt;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4pt 0;
}
h2 {
  font-size: 13pt;
  font-weight: 700;
  color: #111827;
  margin: 16pt 0 6pt 0;
  padding-bottom: 3pt;
  border-bottom: 1.2pt solid #374151;
}
h3 {
  font-size: 11.5pt;
  font-weight: 600;
  color: #111827;
  margin: 10pt 0 3pt 0;
}
p {
  margin: 3pt 0;
  color: #374151;
}
ul {
  margin: 3pt 0 3pt 0;
  padding-left: 16pt;
}
li {
  margin: 2.5pt 0;
  color: #374151;
}
"""


def _escape_html(text: str) -> str:
    """转义 HTML 特殊字符"""
    return escape(text or "")


def _render_inline(node: dict[str, Any]) -> str:
    """渲染内联节点（text / 带 marks 的 text）"""
    if node.get("type") != "text":
        return ""
    text = _escape_html(str(node.get("text", "")))
    marks = node.get("marks") or []
    for mark in marks:
        mark_type = mark.get("type")
        if mark_type == "strong":
            text = f"<strong>{text}</strong>"
        elif mark_type == "em":
            text = f"<em>{text}</em>"
    return text


def _render_content(nodes: list[dict[str, Any]] | None) -> str:
    """渲染节点列表中的内联文本"""
    if not nodes:
        return ""
    return "".join(_render_inline(n) for n in nodes)


def _render_list_item(item: dict[str, Any]) -> str:
    """渲染 listItem（内容可能包含多个 paragraph 节点）"""
    parts: list[str] = []
    for node in item.get("content", []) or []:
        if node.get("type") == "paragraph":
            parts.append(_render_content(node.get("content")))
        else:
            parts.append(_render_inline(node))
    return "".join(parts)


def pm_to_html(content: dict[str, Any]) -> str:
    """将 ProseMirror JSON 文档转换为 HTML 片段（不含外层 <html>）"""
    parts: list[str] = []
    for node in content.get("content", []) or []:
        node_type = node.get("type")
        if node_type == "heading":
            level = int(node.get("attrs", {}).get("level", 2))
            parts.append(f"<h{level}>{_render_content(node.get('content'))}</h{level}>")
        elif node_type == "paragraph":
            parts.append(f"<p>{_render_content(node.get('content'))}</p>")
        elif node_type == "bulletList":
            items: list[str] = []
            for item in node.get("content", []) or []:
                text = _render_list_item(item)
                items.append(f"<li>{text}</li>")
            parts.append(f"<ul>{''.join(items)}</ul>")
    return "".join(parts)


class PDFService:
    """PDF 导出服务"""

    def __init__(self, db: AsyncSession):
        self.repo = ResumeRepository(db)
        self.temp_dir = Path(settings.PDF_TEMP_DIR)

    async def export_resume_pdf(self, resume_id: int, user_id: int) -> bytes:
        """导出简历为 PDF（ATS 单栏模板）"""
        resume = await self.repo.get(resume_id)
        if not resume:
            raise NotFound("简历不存在")
        if resume.user_id != user_id:
            raise NotFound("简历不存在")

        if not resume.current_version_id:
            raise BadRequest("简历内容为空，无法导出")

        version = await self.repo.get_current_version(resume)
        if not version:
            raise BadRequest("简历内容为空，无法导出")

        content = version.content or {}
        html_body = pm_to_html(content)
        if not html_body:
            raise BadRequest("简历内容为空，无法导出")

        document = f"""<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>Resume</title>
<style>{PDF_STYLE}</style>
</head>
<body>
<div class="resume">{html_body}</div>
</body>
</html>"""

        return cast(bytes, HTML(string=document).write_pdf())

    async def cleanup_temp_files(self) -> None:
        """清理临时 PDF 文件"""
        if self.temp_dir.exists():
            for f in self.temp_dir.iterdir():
                f.unlink()
            self.temp_dir.rmdir()
