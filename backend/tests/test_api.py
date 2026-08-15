"""API 层集成测试 — 认证 / 经历 / 简历 / LLM 配置"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.services.llm_client import LLMClient
from app.services.resume_import_service import ResumeImportService

from .conftest import FakeLLM


async def register_and_login(
    client: AsyncClient,
    email: str = "user@example.com",
    password: str = "password123",
) -> dict[str, str]:
    """注册并登录，返回 Authorization 请求头"""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "confirm_password": password,
        },
    )
    assert resp.status_code == 201
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_auth_full_flow(client: AsyncClient):
    """认证完整流程：注册→登录→刷新→登出"""
    await register_and_login(client)

    # 刷新 token
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "password123"},
    )
    refresh_token = login.json()["refresh_token"]
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]

    # 登出
    headers = await register_and_login(client, email="logout@example.com")
    resp = await client.post("/api/v1/auth/logout", headers=headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_auth_error_paths(client: AsyncClient):
    """认证错误路径"""
    # 重复注册 -> 409
    for _ in range(2):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "dupe@example.com",
                "password": "password123",
                "confirm_password": "password123",
            },
        )
    assert resp.status_code == 409

    # 密码不一致 -> 400
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "mismatch@example.com",
            "password": "password123",
            "confirm_password": "different1",
        },
    )
    assert resp.status_code == 400

    # 错误密码 -> 401
    await register_and_login(client, email="wrong@example.com")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "wrong@example.com", "password": "bad-password"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]

    # 未认证访问受保护资源 -> 401
    resp = await client.get("/api/v1/resumes/")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    """修改密码"""
    headers = await register_and_login(client)
    resp = await client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={
            "current_password": "password123",
            "new_password": "newpassword456",
        },
    )
    assert resp.status_code == 200

    # 旧密码登录失败，新密码成功
    assert (
        await client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "password123"},
        )
    ).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "newpassword456"},
        )
    ).status_code == 200


@pytest.mark.asyncio
async def test_experiences_crud(client: AsyncClient):
    """经历 CRUD + 聚合 + 排序"""
    headers = await register_and_login(client)

    # 创建教育 + 工作 + 技能
    edu = await client.post(
        "/api/v1/experiences/",
        headers=headers,
        json={
            "type": "education",
            "school": "Tsinghua University",
            "degree": "Bachelor",
            "field_of_study": "Computer Science",
        },
    )
    assert edu.status_code == 201

    work = await client.post(
        "/api/v1/experiences/",
        headers=headers,
        json={
            "type": "work",
            "company": "ByteDance",
            "position": "Backend Engineer",
            "description": "Core service development",
        },
    )
    assert work.status_code == 201

    await client.post(
        "/api/v1/experiences/",
        headers=headers,
        json={"type": "skill", "name": "Python", "category": "language"},
    )

    # 列表 + 筛选
    resp = await client.get("/api/v1/experiences/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3

    resp = await client.get("/api/v1/experiences/?type=work", headers=headers)
    assert len(resp.json()) == 1

    # 聚合
    resp = await client.get("/api/v1/experiences/aggregate", headers=headers)
    assert resp.status_code == 200
    agg = resp.json()
    assert len(agg["education"]) == 1
    assert len(agg["work"]) == 1
    assert len(agg["skill"]) == 1

    # 更新
    work_id = work.json()["id"]
    resp = await client.put(
        f"/api/v1/experiences/{work_id}",
        headers=headers,
        json={"description": "Updated description"},
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated description"

    # 排序
    resp = await client.put(
        "/api/v1/experiences/reorder",
        headers=headers,
        json={"order": [work_id, edu.json()["id"]]},
    )
    assert resp.status_code == 200

    # 删除
    resp = await client.delete(f"/api/v1/experiences/{work_id}", headers=headers)
    assert resp.status_code == 204

    # 不存在 -> 404
    resp = await client.delete("/api/v1/experiences/9999", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_resumes_crud(client: AsyncClient, fake_llm):
    """简历 CRUD + 内容 + 生成"""
    headers = await register_and_login(client)
    fake_llm(FakeLLM())

    # 创建
    resp = await client.post(
        "/api/v1/resumes/",
        headers=headers,
        json={
            "company_name": "Acme Corp",
            "jd_text": "Looking for a senior backend engineer with experience in Python and distributed systems",
            "target_language": "english",
        },
    )
    assert resp.status_code == 201
    resume_id = resp.json()["id"]

    # 列表 + 详情
    resp = await client.get("/api/v1/resumes/", headers=headers)
    assert len(resp.json()) == 1

    resp = await client.get(f"/api/v1/resumes/{resume_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["company_name"] == "Acme Corp"

    # 不存在 -> 404
    resp = await client.get("/api/v1/resumes/9999", headers=headers)
    assert resp.status_code == 404

    # 内容更新缺少 If-Match -> 400
    resp = await client.put(
        f"/api/v1/resumes/{resume_id}/content",
        headers=headers,
        json={"content": {"doc": {}}},
    )
    assert resp.status_code == 400

    # 带 If-Match 保存 -> 200
    resp = await client.put(
        f"/api/v1/resumes/{resume_id}/content",
        headers={**headers, "If-Match": "1"},
        json={"content": {"doc": {"type": "doc"}}},
    )
    assert resp.status_code == 200
    assert resp.json()["version"] == 1

    # 内容读取
    resp = await client.get(f"/api/v1/resumes/{resume_id}/content", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["version"] == 1

    # 生成（SSE）
    resp = await client.post(
        f"/api/v1/resumes/{resume_id}/generate",
        headers=headers,
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    assert "event: complete" in resp.text

    # 再次生成（并发锁 -> 上一轮已置为 generated，可再次生成）
    resp = await client.post(
        f"/api/v1/resumes/{resume_id}/generate",
        headers=headers,
    )
    assert resp.status_code == 200
    assert "event: complete" in resp.text

    # 删除
    resp = await client.delete(f"/api/v1/resumes/{resume_id}", headers=headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_export_pdf_endpoint(client: AsyncClient):
    """PDF 导出 API"""
    headers = await register_and_login(client)

    resp = await client.post(
        "/api/v1/resumes/",
        headers=headers,
        json={
            "company_name": "Acme Corp",
            "jd_text": "Looking for a senior backend engineer with experience in Python",
            "target_language": "english",
        },
    )
    assert resp.status_code == 201
    resume_id = resp.json()["id"]

    # 未生成内容 -> 400
    resp = await client.get(f"/api/v1/resumes/{resume_id}/export-pdf", headers=headers)
    assert resp.status_code == 400

    # 写入内容后导出 -> PDF
    resp = await client.put(
        f"/api/v1/resumes/{resume_id}/content",
        headers={**headers, "If-Match": "1"},
        json={
            "content": {
                "type": "doc",
                "content": [
                    {
                        "type": "heading",
                        "attrs": {"level": 1},
                        "content": [{"type": "text", "text": "Alice"}],
                    },
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Backend Engineer"}],
                    },
                ],
            }
        },
    )
    assert resp.status_code == 200

    resp = await client.get(f"/api/v1/resumes/{resume_id}/export-pdf", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment" in resp.headers["content-disposition"]
    assert resp.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_analyze_jd_endpoint(client: AsyncClient, fake_llm):
    """JD 分析 API + 结果读取"""
    headers = await register_and_login(client)
    fake_llm(FakeLLM())

    resp = await client.post(
        "/api/v1/resumes/",
        headers=headers,
        json={
            "company_name": "Corp",
            "jd_text": "We are hiring a Python backend developer to build scalable APIs for our platform with FastAPI, PostgreSQL, Docker and AWS.",
            "target_language": "english",
        },
    )
    resume_id = resp.json()["id"]

    resp = await client.post(f"/api/v1/resumes/{resume_id}/analyze-jd", headers=headers)
    assert resp.status_code == 200
    analysis = resp.json()
    assert analysis["resume_id"] == resume_id
    assert analysis["core_responsibilities"]
    assert analysis["required_skills"]

    # 读取已保存分析
    resp = await client.get(f"/api/v1/resumes/{resume_id}/analysis", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["required_skills"] == ["Python"]

    # 过短的 JD -> 400
    short = await client.post(
        "/api/v1/resumes/",
        headers=headers,
        json={"company_name": "X", "jd_text": "short jd", "target_language": "english"},
    )
    resp = await client.post(f"/api/v1/resumes/{short.json()['id']}/analyze-jd", headers=headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_effective_provider(client: AsyncClient):
    """默认 LLM 提供方 = OpenCode 匿名免费模型"""
    headers = await register_and_login(client)

    resp = await client.get("/api/v1/llm-configs/effective", headers=headers)
    assert resp.status_code == 200
    provider = resp.json()
    assert provider["source"] == "opencode_free"
    assert provider["model_name"] == "deepseek-v4-flash-free"

    # 配置并激活自定义模型后，生效提供方切换
    resp = await client.post(
        "/api/v1/llm-configs/",
        headers=headers,
        json={
            "name": "Custom",
            "base_url": "https://api.example.com/v1",
            "api_key": "sk-custom-key",
            "model_name": "my-model",
        },
    )
    config_id = resp.json()["id"]
    await client.put(f"/api/v1/llm-configs/{config_id}/activate", headers=headers)

    resp = await client.get("/api/v1/llm-configs/effective", headers=headers)
    provider = resp.json()
    assert provider["source"] == "custom"
    assert provider["model_name"] == "my-model"


@pytest.mark.asyncio
async def test_llm_configs_crud(client: AsyncClient):
    """LLM 配置 CRUD + 激活"""
    headers = await register_and_login(client)

    # 创建（验证加密返回 mask）
    resp = await client.post(
        "/api/v1/llm-configs/",
        headers=headers,
        json={
            "name": "DeepSeek",
            "base_url": "https://api.deepseek.com/v1",
            "api_key": "sk-very-secret-value",
            "model_name": "deepseek-chat",
        },
    )
    assert resp.status_code == 201
    config_id = resp.json()["id"]
    masked = resp.json()["api_key_masked"]
    assert masked.startswith("sk-very")
    assert "sk-very-secret-value" not in masked

    # 列表脱敏
    resp = await client.get("/api/v1/llm-configs/", headers=headers)
    assert len(resp.json()) == 1
    assert "sk-very-secret-value" not in resp.text

    # 激活
    resp = await client.put(
        f"/api/v1/llm-configs/{config_id}/activate",
        headers=headers,
    )
    assert resp.status_code == 200

    resp = await client.get("/api/v1/llm-configs/", headers=headers)
    assert resp.json()[0]["is_active"] is True

    # 删除
    resp = await client.delete(f"/api/v1/llm-configs/{config_id}", headers=headers)
    assert resp.status_code == 204

    # 不存在 -> 404
    resp = await client.delete("/api/v1/llm-configs/9999", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_llm_configs_test_endpoint(client: AsyncClient, monkeypatch):
    """测试连接端点（mock 掉真实网络）"""
    headers = await register_and_login(client)

    async def fake_test(self: LLMClient) -> None:
        return None

    monkeypatch.setattr(LLMClient, "test_connection", fake_test)

    resp = await client.post(
        "/api/v1/llm-configs/test",
        headers=headers,
        json={
            "base_url": "https://api.example.com/v1",
            "api_key": "sk-test",
            "model_name": "test-model",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 模型名缺失 -> 422
    resp = await client.post(
        "/api/v1/llm-configs/test",
        headers=headers,
        json={
            "base_url": "https://api.example.com/v1",
            "api_key": "sk-test",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_experiences_import_resume(client: AsyncClient, monkeypatch):
    """上传简历自动识别并添加经历"""
    extraction_json = (
        '{"education": [{"school": "清华大学", "degree": "本科"}], '
        '"work": [{"company": "字节跳动", "position": "后端工程师", "description": "核心服务开发"}], '
        '"project": [], "skill": [{"name": "Python", "category": "语言", "proficiency": "expert"}], '
        '"certificate": []}'
    )

    async def _get_client(self, user_id):
        return FakeLLM(chat_result=extraction_json)

    monkeypatch.setattr(ResumeImportService, "_get_client", _get_client)

    headers = await register_and_login(client)
    resume_txt = (
        "软件工程师\n教育经历：清华大学，计算机，2020 - 2024\n"
        "工作经历：字节跳动，后端工程师，负责核心服务开发\n"
        "技能：Python\n"
    )
    files = {"file": ("resume.txt", resume_txt.encode("utf-8"), "text/plain")}
    resp = await client.post("/api/v1/experiences/import", headers=headers, files=files)
    assert resp.status_code == 201

    data = resp.json()
    assert data["added_count"] == 3
    assert data["by_type"]["education"] == 1
    assert data["by_type"]["skill"] == 1
    assert data["experiences"]["work"][0]["company"] == "字节跳动"

    resp = await client.get("/api/v1/experiences/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3


@pytest.mark.asyncio
async def test_experiences_import_resume_bad_file(client: AsyncClient):
    """不支持的文件类型返回 400"""
    headers = await register_and_login(client)
    files = {"file": ("resume.exe", b"content", "application/octet-stream")}
    resp = await client.post("/api/v1/experiences/import", headers=headers, files=files)
    assert resp.status_code == 400
    assert "仅支持" in resp.json()["detail"]
