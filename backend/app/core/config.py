"""ResumeForge 后端配置"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://resumeforge:resumeforge_dev_2024@localhost:5432/resumeforge"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 加密
    ENCRYPTION_KEY: str = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2"

    # CORS
    CORS_ORIGINS: str = "*"

    # LLM 默认配置
    LLM_REQUEST_TIMEOUT: int = 120
    LLM_STREAM_TIMEOUT: int = 300

    # PDF
    PDF_TEMP_DIR: str = "/tmp/resumeforge-pdf"
    PDF_MAX_CONCURRENT: int = 2

    class Config:
        env_file = ".env"


settings = Settings()
