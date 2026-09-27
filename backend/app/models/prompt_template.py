"""SQLAlchemy 模型 — Prompt 模板版本管理"""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PromptTemplate(Base):
    """可配置的系统提示词模板（按 key + version 版本化，同一 key 仅一个激活版本）"""

    __tablename__ = "prompt_templates"
    __table_args__ = (UniqueConstraint("key", "version", name="uq_prompt_key_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(100), index=True)  # jd_analysis / resume_generation / resume_parse
    version: Mapped[int] = mapped_column(Integer, default=1)
    system_template: Mapped[str] = mapped_column(Text)  # str.format 模板，含 {target_language} 等占位符
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
