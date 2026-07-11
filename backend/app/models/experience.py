"""SQLAlchemy 模型 — 个人经历"""
from datetime import datetime, timezone

from sqlalchemy import (
    Column, DateTime, ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Experience(Base):
    """统一经历基类"""
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)  # education / work / project / skill / certificate
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 教育
    school = Column(String(300))
    degree = Column(String(100))
    field_of_study = Column(String(200))
    gpa = Column(String(20))

    # 工作
    company = Column(String(300))
    position = Column(String(200))

    # 通用
    start_date = Column(String(10))  # YYYY-MM-DD
    end_date = Column(String(10), nullable=True)  # null = 至今
    description = Column(Text)  # Markdown

    # 项目
    role = Column(String(200))
    tech_tags = Column(JSON)  # ["Python", "FastAPI"]
    url = Column(String(500))

    # 技能
    name = Column(String(200))
    category = Column(String(100))
    proficiency = Column(String(20))  # beginner / intermediate / expert

    # 证书
    issuer = Column(String(200))
    credential_url = Column(String(500))

    user = relationship("User", back_populates="experiences")
