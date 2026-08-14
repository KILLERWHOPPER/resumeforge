"""Prompt 工程 — JD 分析与简历内容生成"""

from __future__ import annotations

import json
from typing import Any


def build_jd_analysis_prompt(jd_text: str, target_language: str) -> list[dict[str, str]]:
    """JD 分析 Prompt：提取核心职责、技能、经验类型、软技能与 ATS 关键词"""
    system = (
        "你是一名资深招聘分析师与简历顾问。请分析给定的职位描述（JD），"
        "并严格只输出一个 JSON 对象，不要输出任何其他文字、解释或 Markdown 代码块。\n"
        "输出结构如下：\n"
        "{\n"
        '  "core_responsibilities": ["核心职责1", "核心职责2", ...],\n'
        '  "required_skills": ["必备技能1", "必备技能2", ...],\n'
        '  "preferred_skills": ["加分技能1", ...],\n'
        '  "experience_level": "例如：3-5年",\n'
        '  "soft_skills": ["软技能1", ...],\n'
        '  "keywords": ["ATS关键词1", ...]\n'
        "}\n"
        "要求：\n"
        "- 职责与技能必须从 JD 原文提取，不要编造。\n"
        "- required_skills 为该职位必须掌握的硬技能，preferred_skills 为加分项。\n"
        "- keywords 为 HR 与 ATS 筛选常用的关键词（含技术栈、工具、方法论等）。\n"
        f"- 所有字段内容使用「{target_language}」撰写。"
    )
    user = f"职位描述：\n{jd_text}"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def build_resume_generation_prompt(
    analysis: dict[str, Any],
    experiences: dict[str, Any],
    target_language: str,
    company_name: str | None,
) -> list[dict[str, str]]:
    """简历生成 Prompt：基于 JD 分析与用户经历，生成针对性简历内容"""
    system = (
        "你是一名顶尖的简历优化专家。根据职位描述（JD）分析结果和用户的个人经历，"
        "为求职者撰写一份高度针对性的简历内容。\n"
        "核心原则：\n"
        "1. 使用 STAR 原则把经历改写为结果导向的成就描述，优先突出与 JD 匹配的技能与关键词。\n"
        "2. 只使用用户提供的真实经历，不要编造经历或数据。\n"
        "3. 每条 bullet 简洁有力（10-25 个词），以动词开头，尽量包含量化成果。\n"
        "4. 输出严格为一个 JSON 对象，不要输出任何其他文字或 Markdown 代码块。\n"
        "输出结构如下：\n"
        "{\n"
        '  "summary": "3-4 句职业摘要，突出与岗位最匹配的经验与技能",\n'
        '  "sections": [\n'
        '    {"type": "work", "title": "工作经历", "items": [{"heading": "职位 · 公司（起止时间）", "bullets": ["成就描述1", ...]}]},\n'
        '    {"type": "project", "title": "项目经历", "items": [{"heading": "项目名 · 角色（起止时间）", "bullets": [...]}]},\n'
        '    {"type": "education", "title": "教育经历", "items": [{"heading": "学位 · 学校（起止时间）", "bullets": [...]}]},\n'
        '    {"type": "skill", "title": "技能", "items": [{"heading": "技能类别", "bullets": ["技能列表"]}]},\n'
        '    {"type": "certificate", "title": "证书", "items": [{"heading": "证书名 · 颁发机构", "bullets": []}]}\n'
        "  ]\n"
        "}\n"
        "注意：\n"
        "- 若某类经历为空，则 sections 中不要包含该类型。\n"
        "- 优先把工作经历与项目经历放在最前，教育经历在后。\n"
        "- 技能 section 的 items 按用户已填写的分类组织，heading 为分类名，bullets 为技能名列表。\n"
        "- 证书 section 的 bullets 可留空。\n"
        f"- 所有内容使用「{target_language}」撰写。"
    )
    payload = {
        "company_name": company_name,
        "jd_analysis": analysis,
        "user_experiences": experiences,
    }
    user = json.dumps(payload, ensure_ascii=False)
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def build_resume_parse_prompt(
    resume_text: str,
    language: str | None = None,
) -> list[dict[str, str]]:
    """简历解析 Prompt：从简历原文提取结构化经历"""
    if language:
        lang_instruction = f"- 所有字段内容使用「{language}」撰写（若原文是其他语言则翻译）。"
    else:
        lang_instruction = "- 所有字段内容保留简历原文的语言，只做规范化整理，不要翻译。"
    system = (
        "你是一名专业的简历解析助手。请从简历文本中提取完整的个人经历，"
        "并严格只输出一个 JSON 对象，不要输出任何其他文字、解释或 Markdown 代码块。\n"
        "输出结构如下：\n"
        "{\n"
        '  "education": [{"school": "学校", "degree": "学位", "field_of_study": "专业", "gpa": "GPA", "start_date": "YYYY-MM", "end_date": "YYYY-MM 或 present", "description": "描述"}],\n'
        '  "work": [{"company": "公司", "position": "职位", "start_date": "YYYY-MM", "end_date": "YYYY-MM 或 present", "description": "职责与成就"}],\n'
        '  "project": [{"name": "项目名", "role": "角色", "tech_tags": ["技术栈"], "url": "链接", "start_date": "YYYY-MM", "end_date": "YYYY-MM 或 present", "description": "描述"}],\n'
        '  "skill": [{"name": "技能名", "category": "分类（如 语言/框架/工具）", "proficiency": "beginner 或 intermediate 或 expert"}],\n'
        '  "certificate": [{"name": "证书名", "issuer": "颁发机构", "credential_url": "证书链接", "description": "描述"}]\n'
        "}\n"
        "要求：\n"
        "- 只从简历原文提取真实信息，不要编造学校、公司、职位、证书或数据。\n"
        "- 无法识别的字段省略即可，不要填 null 或空字符串。\n"
        '- start_date / end_date 统一格式化为 YYYY-MM；仍在职/在读用 "present"。\n'
        "- tech_tags 为项目使用的技术栈列表；无则省略。\n"
        "- 简历中未出现的类型用空数组表示。\n"
        f"{lang_instruction}"
    )
    user = f"简历文本：\n{resume_text}"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def serialize_experiences(aggregate: dict[str, Any]) -> dict[str, Any]:
    """将经历聚合结果序列化为用于 Prompt 的紧凑结构"""
    serialized: dict[str, list[dict[str, Any]]] = {
        "education": [],
        "work": [],
        "project": [],
        "skill": [],
        "certificate": [],
    }

    for exp in aggregate.get("education", []):
        serialized["education"].append(
            {
                "school": exp.school,
                "degree": exp.degree,
                "field_of_study": exp.field_of_study,
                "gpa": exp.gpa,
                "start_date": exp.start_date,
                "end_date": exp.end_date,
                "description": exp.description,
            }
        )
    for exp in aggregate.get("work", []):
        serialized["work"].append(
            {
                "company": exp.company,
                "position": exp.position,
                "start_date": exp.start_date,
                "end_date": exp.end_date,
                "description": exp.description,
            }
        )
    for exp in aggregate.get("project", []):
        serialized["project"].append(
            {
                "name": exp.name,
                "role": exp.role,
                "tech_tags": exp.tech_tags or [],
                "start_date": exp.start_date,
                "end_date": exp.end_date,
                "description": exp.description,
                "url": exp.url,
            }
        )
    for exp in aggregate.get("skill", []):
        serialized["skill"].append(
            {
                "name": exp.name,
                "category": exp.category,
                "proficiency": exp.proficiency,
            }
        )
    for exp in aggregate.get("certificate", []):
        serialized["certificate"].append(
            {
                "name": exp.name,
                "issuer": exp.issuer,
                "credential_url": exp.credential_url,
            }
        )
    return serialized


def completeness_check(aggregate: dict[str, Any]) -> dict[str, Any]:
    """经历完整性检查：返回各类型数量与缺失提醒"""
    counts: dict[str, int] = {
        key: len(aggregate.get(key, []))
        for key in ("education", "work", "project", "skill", "certificate")
    }
    missing = []
    if counts["work"] == 0 and counts["project"] == 0:
        missing.append("工作或项目经历")
    if counts["education"] == 0:
        missing.append("教育经历")
    if counts["skill"] == 0:
        missing.append("技能")
    return {
        "counts": counts,
        "missing": missing,
        "complete": len(missing) == 0,
    }
