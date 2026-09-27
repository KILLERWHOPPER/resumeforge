"""API v1 路由导出"""

from app.api.v1 import auth, experiences, llm_configs, prompt_templates, resumes

__all__ = ["auth", "experiences", "resumes", "llm_configs", "prompt_templates"]
