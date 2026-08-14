"""LLM 配置服务"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crypto import decrypt_or_plaintext, encrypt
from app.core.exceptions import NotFound
from app.models.llm_config import LLMConfig
from app.repositories.llm_config_repository import LLMConfigRepository
from app.schemas.resume import LLMConfigCreate, LLMConfigResponse, LLMConfigTest
from app.services.llm_client import LLMClient


class LLMConfigService:
    """LLM 配置服务"""

    def __init__(self, db: AsyncSession):
        self.repo = LLMConfigRepository(db)

    async def list_configs(self, user_id: int) -> list[LLMConfigResponse]:
        """获取所有 LLM 配置（脱敏后）"""
        configs = await self.repo.list_by_user(user_id)
        return [
            LLMConfigResponse(
                id=c.id,
                name=c.name,
                base_url=c.base_url,
                model_name=c.model_name,
                is_active=c.is_active,
                api_key_masked=self._mask(decrypt_or_plaintext(c.api_key_encrypted)),
            )
            for c in configs
        ]

    def _mask(self, plaintext: str) -> str:
        """脱敏 API Key"""
        mask_len = 8
        if not plaintext:
            return "未配置"
        return plaintext[:mask_len] + "..." if len(plaintext) > mask_len else plaintext

    async def create_config(
        self,
        user_id: int,
        data: LLMConfigCreate,
    ) -> LLMConfigResponse:
        """创建 LLM 配置（API Key 使用 AES-256-GCM 加密存储）"""
        api_key_encrypted = encrypt(data.api_key)

        config = await self.repo.create(
            user_id=user_id,
            name=data.name,
            base_url=data.base_url,
            api_key_encrypted=api_key_encrypted,
            model_name=data.model_name,
            is_active=data.is_active,
        )
        return LLMConfigResponse(
            id=config.id,
            name=config.name,
            base_url=config.base_url,
            model_name=config.model_name,
            is_active=config.is_active,
            api_key_masked=self._mask(data.api_key),
        )

    async def activate_config(self, config_id: int, user_id: int) -> dict:
        """激活指定配置"""
        # 先取消所有激活
        await self.repo.deactivate_all(user_id)

        # 激活指定配置
        config = await self.repo.get(config_id)
        if not config or config.user_id != user_id:
            raise NotFound("配置不存在")

        config.is_active = True
        await self.repo.db.flush()
        return {"message": f"已激活: {config.name}"}

    async def delete_config(self, config_id: int, user_id: int) -> None:
        """删除 LLM 配置"""
        config = await self.repo.get(config_id)
        if not config or config.user_id != user_id:
            raise NotFound("配置不存在")
        await self.repo.db.delete(config)

    async def get_active_config(self, user_id: int) -> LLMConfig | None:
        """获取用户当前激活的配置"""
        return await self.repo.get_active(user_id)

    async def test_connection(self, user_id: int, data: LLMConfigTest) -> dict:
        """测试 LLM 配置连接（不落库）"""
        client = LLMClient(
            base_url=data.base_url,
            api_key=data.api_key,
            model_name=data.model_name,
        )
        await client.test_connection()
        return {"success": True, "message": f"连接成功: {data.model_name}"}

    async def get_decrypted_api_key(self, config_id: int, user_id: int) -> str:
        """获取已解密（或历史明文）的 API Key"""
        config = await self.repo.get(config_id)
        if not config or config.user_id != user_id:
            raise NotFound("配置不存在")
        return decrypt_or_plaintext(config.api_key_encrypted)
