"""AI 简历生成服务 — JD 分析 + 简历内容生成（SSE 流式）"""
# ruff: noqa: TRY003

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequest, Conflict
from app.repositories.resume_repository import ResumeRepository
from app.repositories.user_repository import UserRepository
from app.schemas.resume import JDAnalysisResponse
from app.services.experience_service import ExperienceService
from app.services.llm_client import LLMClient
from app.services.llm_config_service import LLMConfigService
from app.services.llm_utils import extract_json
from app.services.prompts import (
    build_jd_analysis_prompt,
    build_resume_generation_prompt,
    completeness_check,
    serialize_experiences,
)
from app.services.prosemirror import build_prose_mirror, build_user_header
from app.services.resume_service import ResumeService

logger = logging.getLogger(__name__)

JD_MIN_LENGTH = 50
GENERATION_MAX_TOKENS = 4096


class AIResumeService:
    """JD 分析与简历生成服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.resume_repo = ResumeRepository(db)
        self.resume_service = ResumeService(db)
        self.experience_service = ExperienceService(db)
        self.llm_config_service = LLMConfigService(db)
        self.user_repo = UserRepository(db)

    async def get_effective_provider(self, user_id: int) -> dict[str, Any]:
        """获取当前生效的 LLM 提供方（用户配置优先，否则回退到 OpenCode 匿名免费模型）"""
        config = await self.llm_config_service.get_active_config(user_id)
        if config:
            return {
                "source": "custom",
                "name": config.name,
                "model_name": config.model_name,
                "base_url": config.base_url,
            }
        return {
            "source": "opencode_free",
            "name": settings.OPENCODE_ANON_NAME,
            "model_name": settings.OPENCODE_ANON_MODEL,
            "base_url": settings.OPENCODE_ANON_BASE_URL,
        }

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

    async def analyze_jd(self, resume_id: int, user_id: int) -> JDAnalysisResponse:
        """分析 JD 并保存结果"""
        resume = await self.resume_service.get_resume(resume_id, user_id)
        if not resume.jd_text or len(resume.jd_text.strip()) < JD_MIN_LENGTH:
            raise BadRequest("职位描述过短（至少 50 字符），无法分析")

        client = await self._get_client(user_id)
        messages = build_jd_analysis_prompt(resume.jd_text, resume.target_language)
        try:
            raw = await client.chat(messages, temperature=0)
        except Exception:
            logger.exception("JD 分析失败 resume_id=%s user_id=%s", resume_id, user_id)
            raise
        analysis = extract_json(raw)
        self._validate_analysis(analysis)

        saved = await self.resume_repo.save_jd_analysis(resume_id, analysis)
        return JDAnalysisResponse(
            resume_id=resume_id,
            core_responsibilities=analysis.get("core_responsibilities", []),
            required_skills=analysis.get("required_skills", []),
            preferred_skills=analysis.get("preferred_skills", []),
            experience_level=analysis.get("experience_level", ""),
            soft_skills=analysis.get("soft_skills", []),
            keywords=analysis.get("keywords", []),
            created_at=saved.created_at,
        )

    async def get_analysis(self, resume_id: int, user_id: int) -> JDAnalysisResponse | None:
        """获取已保存的 JD 分析结果"""
        await self.resume_service.get_resume(resume_id, user_id)
        saved = await self.resume_repo.get_jd_analysis(resume_id)
        if not saved:
            return None
        analysis = saved.analysis
        return JDAnalysisResponse(
            resume_id=resume_id,
            core_responsibilities=analysis.get("core_responsibilities", []),
            required_skills=analysis.get("required_skills", []),
            preferred_skills=analysis.get("preferred_skills", []),
            experience_level=analysis.get("experience_level", ""),
            soft_skills=analysis.get("soft_skills", []),
            keywords=analysis.get("keywords", []),
            created_at=saved.created_at,
        )

    async def generate_resume(self, resume_id: int, user_id: int) -> AsyncIterator[dict[str, Any]]:
        """生成简历（SSE 事件流），并发生成锁防止重复触发"""
        resume = await self.resume_service.get_resume(resume_id, user_id)

        if not resume.jd_text:
            raise BadRequest("职位描述为空，无法生成")

        if resume.status == "generating":
            raise Conflict("简历正在生成中，请勿重复操作")

        resume.status = "generating"
        await self.db.flush()

        try:
            yield {"event": "status", "stage": "preparing", "message": "准备生成简历..."}

            # 1. 确保 JD 分析存在
            saved_analysis = await self.resume_repo.get_jd_analysis(resume_id)
            if not saved_analysis:
                yield {"event": "status", "stage": "analyzing", "message": "正在分析职位要求..."}
                client = await self._get_client(user_id)
                raw = await client.chat(
                    build_jd_analysis_prompt(resume.jd_text, resume.target_language),
                    temperature=0,
                )
                analysis = extract_json(raw)
                self._validate_analysis(analysis)
                saved_analysis = await self.resume_repo.save_jd_analysis(resume_id, analysis)
            else:
                analysis = saved_analysis.analysis

            # 2. 加载个人经历并校验完整性
            yield {"event": "status", "stage": "matching", "message": "正在匹配个人经历..."}
            experiences = await self.experience_service.aggregate(user_id)
            serialized = serialize_experiences(experiences)
            check = completeness_check(experiences)

            # 3. 流式生成简历内容
            yield {"event": "status", "stage": "writing", "message": "正在撰写简历内容..."}
            client = await self._get_client(user_id)
            messages = build_resume_generation_prompt(
                analysis=analysis,
                experiences=serialized,
                target_language=resume.target_language,
                company_name=resume.company_name,
            )
            parts: list[str] = []
            async for chunk in client.chat_stream(
                messages, temperature=0.5, max_tokens=GENERATION_MAX_TOKENS
            ):
                parts.append(chunk)
                yield {"event": "chunk", "delta": chunk}

            # 4. 解析并落库（头部拼接用户个人资料）
            generated = extract_json("".join(parts))
            content = build_prose_mirror(generated)

            user = await self.user_repo.get(user_id)
            if user:
                header = build_user_header(
                    {
                        "name_zh": user.name_zh,
                        "name_en": user.name_en,
                        "email": user.email,
                        "contact_email": user.contact_email,
                        "phone": user.phone,
                        "address": user.address,
                        "linkedin_url": user.linkedin_url,
                    },
                    resume.target_language,
                )
                content["content"] = header + content["content"]

            version_number = await self.resume_repo.next_version_number(resume)
            version = await self.resume_repo.create_version(
                resume_id=resume_id,
                content=content,
                version_number=version_number,
            )
            resume.current_version_id = version.id
            resume.status = "generated"
            await self.db.flush()

            logger.info("简历生成成功 resume_id=%s version=%s", resume_id, version.version_number)

            yield {
                "event": "complete",
                "resume_id": resume_id,
                "version": version.version_number,
                "completeness": check,
            }
        except Exception as exc:
            logger.exception("简历生成失败 resume_id=%s user_id=%s", resume_id, user_id)
            resume.status = "failed"
            await self.db.flush()
            yield {
                "event": "error",
                "message": self._friendly_error(exc),
            }

    def _friendly_error(self, exc: Exception) -> str:
        """将异常转换为面向用户的中文错误信息"""
        if isinstance(exc, BadRequest):
            return exc.detail
        return f"生成失败，请重试: {exc}"

    def _validate_analysis(self, analysis: dict[str, Any]) -> None:
        """校验 JD 分析结果结构"""
        required_keys = (
            "core_responsibilities",
            "required_skills",
            "preferred_skills",
            "experience_level",
            "soft_skills",
            "keywords",
        )
        missing = [key for key in required_keys if key not in analysis]
        if missing:
            raise BadRequest(f"JD 分析结果缺少字段: {', '.join(missing)}")
