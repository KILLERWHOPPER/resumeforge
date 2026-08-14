"""SQLAlchemy 模型 — 个人经历"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Experience(Base):
    """统一经历基类"""

    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(
        String(20)
    )  # education / work / project / skill / certificate
    sort_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # 教育
    school: Mapped[str | None] = mapped_column(String(300))
    degree: Mapped[str | None] = mapped_column(String(100))
    field_of_study: Mapped[str | None] = mapped_column(String(200))
    gpa: Mapped[str | None] = mapped_column(String(20))

    # 工作
    company: Mapped[str | None] = mapped_column(String(300))
    position: Mapped[str | None] = mapped_column(String(200))

    # 通用
    start_date: Mapped[str | None] = mapped_column(String(10))  # YYYY-MM-DD
    end_date: Mapped[str | None] = mapped_column(String(10))  # null = 至今
    description: Mapped[str | None] = mapped_column(Text)  # Markdown

    # 项目
    role: Mapped[str | None] = mapped_column(String(200))
    tech_tags: Mapped[list[Any] | None] = mapped_column(JSON)  # ["Python", "FastAPI"]
    url: Mapped[str | None] = mapped_column(String(500))

    # 技能
    name: Mapped[str | None] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(100))
    proficiency: Mapped[str | None] = mapped_column(String(20))  # beginner / intermediate / expert

    # 证书
    issuer: Mapped[str | None] = mapped_column(String(200))
    credential_url: Mapped[str | None] = mapped_column(String(500))

    user = relationship("User", back_populates="experiences")
