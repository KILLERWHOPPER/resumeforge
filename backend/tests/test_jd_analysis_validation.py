"""JD 分析深度校验测试"""

from __future__ import annotations

import pytest

from app.core.exceptions import BadRequest
from app.schemas.resume import validate_jd_analysis


def _raw() -> dict:
    return {
        "core_responsibilities": ["开发服务"],
        "required_skills": ["Python"],
        "preferred_skills": [],
        "experience_level": "3-5年",
        "soft_skills": ["沟通"],
        "keywords": ["FastAPI"],
    }


def test_valid_passes_through():
    result = validate_jd_analysis(_raw())
    assert result["required_skills"] == ["Python"]


def test_missing_field_rejected():
    raw = _raw()
    del raw["keywords"]
    with pytest.raises(BadRequest, match="缺少字段: keywords"):
        validate_jd_analysis(raw)


def test_non_dict_rejected():
    with pytest.raises(BadRequest, match="JSON 对象"):
        validate_jd_analysis(["not", "a", "dict"])  # type: ignore[arg-type]


def test_scalar_coerced_to_list():
    raw = _raw()
    raw["required_skills"] = "Python"
    assert validate_jd_analysis(raw)["required_skills"] == ["Python"]


def test_null_items_dropped_and_whitespace_stripped():
    raw = _raw()
    raw["keywords"] = [" FastAPI ", None, "", 42]
    assert validate_jd_analysis(raw)["keywords"] == ["FastAPI", "42"]


def test_null_experience_level_coerced_to_empty():
    raw = _raw()
    raw["experience_level"] = None
    assert validate_jd_analysis(raw)["experience_level"] == ""
