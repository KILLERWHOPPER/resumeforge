"""简历导入服务 — 上传简历文件 → 提取文本 → LLM 结构化 → 批量落库"""

# ruff: noqa: TRY003

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest
from app.models.experience import Experience
from app.repositories.experience_repository import ExperienceRepository
from app.schemas.experience import ExperienceImportResponse, ExperienceResponse
from app.services.llm_client import LLMClient
from app.services.llm_config_service import LLMConfigService
from app.services.llm_utils import extract_json
from app.services.prompts import build_resume_parse_prompt
from app.services.resume_parser import extract_resume_text

TYPE_ORDER = ("education", "work", "project", "skill", "certificate")

KEY_FIELD: dict[str, str] = {
    "education": "school",
    "work": "company",
    "project": "name",
    "skill": "name",
    "certificate": "name",
}

ALLOWED_FIELDS: dict[str, set[str]] = {
    "education": {
        "school",
        "degree",
        "field_of_study",
        "gpa",
        "start_date",
        "end_date",
        "description",
    },
    "work": {"company", "position", "start_date", "end_date", "description"},
    "project": {"name", "role", "tech_tags", "url", "start_date", "end_date", "description"},
    "skill": {"name", "category", "proficiency"},
    "certificate": {"name", "issuer", "credential_url", "description"},
}

MAX_LENGTHS: dict[str, int] = {
    "school": 300,
    "degree": 100,
    "field_of_study": 200,
    "company": 300,
    "position": 200,
    "name": 300,
    "role": 200,
    "category": 100,
    "issuer": 200,
    "url": 500,
    "credential_url": 500,
    "gpa": 20,
}

PROFICIENCY_MAP: dict[str, str] = {
    "beginner": "beginner",
    "入门": "beginner",
    "初级": "beginner",
    "基础": "beginner",
    "intermediate": "intermediate",
    "熟练": "intermediate",
    "中级": "intermediate",
    "expert": "expert",
    "精通": "expert",
    "高级": "expert",
    "专家": "expert",
    "advanced": "expert",
}


class ResumeImportService:
    """简历导入：文本提取 + LLM 抽取 + 批量落库"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.experience_repo = ExperienceRepository(db)
        self.llm_config_service = LLMConfigService(db)

    async def _get_client(self, user_id: int) -> LLMClient:
        """构建 LLM 客户端：优先用户配置，否则使用 OpenCode 匿名免费模型"""
        config = await self.llm_config_service.get_active_config(user_id)
        if config:
            api_key = await self.llm_config_service.get_decrypted_api_key(config.id, user_id)
            return LLMClient(
                base_url=config.base_url,
                api_key=api_key,
                model_name=config.model_name,
            )
        return LLMClient.for_opencode_anon()

    async def import_resume(
        self,
        user_id: int,
        filename: str,
        content: bytes,
        language: str | None = None,
    ) -> ExperienceImportResponse:
        """导入简历：解析文件 → LLM 抽取经历 → 校验 → 批量创建"""
        text = extract_resume_text(filename, content)

        client = await self._get_client(user_id)
        messages = build_resume_parse_prompt(text, language)
        raw = await client.chat(messages, temperature=0, max_tokens=4096)
        parsed = extract_json(raw)

        normalized = self._normalize(parsed)
        created = await self._insert_all(user_id, normalized)

        added_count = sum(len(items) for items in created.values())
        if added_count == 0:
            raise BadRequest("未从简历中识别到可添加的经历，请检查文件内容")

        return ExperienceImportResponse(
            added_count=added_count,
            by_type={exp_type: len(items) for exp_type, items in created.items()},
            experiences={
                exp_type: [ExperienceResponse.model_validate(item) for item in items]
                for exp_type, items in created.items()
            },
        )

    def _normalize(self, parsed: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
        """将 LLM 返回的 JSON 清洗为每类型待创建字段列表"""
        if not isinstance(parsed, dict):
            raise BadRequest("AI 解析结果格式异常，请重试")
        result: dict[str, list[dict[str, Any]]] = {exp_type: [] for exp_type in TYPE_ORDER}
        for exp_type in TYPE_ORDER:
            raw_list = parsed.get(exp_type, [])
            if not isinstance(raw_list, list):
                continue
            for raw_item in raw_list:
                item = self._clean_item(exp_type, raw_item)
                if item:
                    result[exp_type].append(item)
        return result

    def _clean_item(self, exp_type: str, raw: Any) -> dict[str, Any] | None:
        """清洗单个经历条目：过滤字段、剔除空值与非法技能等级"""
        if not isinstance(raw, dict):
            return None
        key_field = KEY_FIELD[exp_type]
        key_value = raw.get(key_field)
        if not isinstance(key_value, str) or not key_value.strip():
            return None

        cleaned: dict[str, Any] = {}
        for field in ALLOWED_FIELDS[exp_type]:
            value = raw.get(field)
            if value is None:
                continue
            if field == "tech_tags":
                if isinstance(value, list):
                    tags = [str(tag).strip() for tag in value if str(tag).strip()]
                    if tags:
                        cleaned[field] = tags[:20]
                continue
            if not isinstance(value, str):
                continue
            value = value.strip()
            if not value:
                continue
            if field == "proficiency":
                normalized = PROFICIENCY_MAP.get(value.lower(), value)
                if normalized not in ("beginner", "intermediate", "expert"):
                    continue
                value = normalized
            max_len = MAX_LENGTHS.get(field)
            if max_len is not None and len(value) > max_len:
                value = value[:max_len]
            cleaned[field] = value
        return cleaned

    async def _insert_all(
        self,
        user_id: int,
        items: dict[str, list[dict[str, Any]]],
    ) -> dict[str, list[Experience]]:
        """按类型批量创建经历，返回创建的 ORM 对象"""
        created: dict[str, list[Experience]] = {exp_type: [] for exp_type in TYPE_ORDER}
        for exp_type in TYPE_ORDER:
            for idx, fields in enumerate(items[exp_type]):
                experience = await self.experience_repo.create(
                    user_id=user_id,
                    type=exp_type,
                    sort_order=idx,
                    **fields,
                )
                created[exp_type].append(experience)
        return created
