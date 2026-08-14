"""Prompt 工程与 ProseMirror 构建器测试"""

from __future__ import annotations

from app.services.prompts import (
    build_jd_analysis_prompt,
    build_resume_generation_prompt,
    completeness_check,
    serialize_experiences,
)
from app.services.prosemirror import build_prose_mirror


def test_build_jd_analysis_prompt_structure():
    messages = build_jd_analysis_prompt("Hiring Python dev", "english")
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "JSON" in messages[0]["content"]
    assert messages[1]["role"] == "user"
    assert "Hiring Python dev" in messages[1]["content"]


def test_build_resume_generation_prompt_structure():
    analysis = {"required_skills": ["Python"]}
    experiences = {"work": [], "education": [], "project": [], "skill": [], "certificate": []}
    messages = build_resume_generation_prompt(analysis, experiences, "english", "Acme")
    user = messages[1]["content"]
    assert "Acme" in user
    assert "Python" in user


def test_serialize_experiences():
    class Exp:
        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)

    aggregate = {
        "education": [Exp(school="THU", degree="BS", field_of_study="CS", gpa="3.8", start_date="2020", end_date="2024", description="d")],
        "work": [Exp(company="ByteDance", position="Engineer", start_date="2024", end_date=None, description="svc")],
        "project": [Exp(name="Shop", role="Lead", tech_tags=["Python"], start_date="2023", end_date="2024", description="p", url="https://x")],
        "skill": [Exp(name="Python", category="language", proficiency="expert")],
        "certificate": [Exp(name="AWS", issuer="Amazon", credential_url="https://c")],
    }
    result = serialize_experiences(aggregate)
    assert result["work"][0]["company"] == "ByteDance"
    assert result["project"][0]["tech_tags"] == ["Python"]
    assert result["skill"][0]["name"] == "Python"
    assert result["certificate"][0]["issuer"] == "Amazon"
    assert "date" not in result["certificate"][0]


def test_completeness_check():
    aggregate = {"work": [], "project": [], "education": [], "skill": [], "certificate": []}
    check = completeness_check(aggregate)
    assert check["complete"] is False
    assert "工作或项目经历" in check["missing"]

    aggregate = {
        "work": [{"id": 1}],
        "project": [{"id": 2}],
        "education": [{"id": 3}],
        "skill": [{"id": 4}],
        "certificate": [],
    }
    check = completeness_check(aggregate)
    assert check["complete"] is True


def test_build_prose_mirror_full():
    content = {
        "summary": "Professional summary",
        "sections": [
            {
                "type": "work",
                "title": "工作经历",
                "items": [
                    {"heading": "职位 · 公司", "bullets": ["成就1", "成就2"]},
                    {"heading": "", "bullets": ["孤儿 bullet"]},
                ],
            },
            {"type": "skill", "title": "技能", "items": [{"heading": "Python", "bullets": []}]},
        ],
    }
    doc = build_prose_mirror(content)
    assert doc["type"] == "doc"
    node_types = [n["type"] for n in doc["content"]]
    assert node_types == ["paragraph", "heading", "heading", "bulletList", "bulletList", "heading", "heading"]

    # 空输入不崩溃
    empty = build_prose_mirror({})
    assert empty == {"type": "doc", "content": []}
