# ResumeForge

基于 AI 的结构化简历生成与优化平台。帮助求职者基于个人经历，生成针对特定职位/公司优化的简历。

## 快速启动

```bash
git clone <repo-url> resumeforge
cd resumeforge
cp .env.example .env
# 编辑 .env 设置密码和密钥
docker compose up -d
```

访问 http://localhost:3000

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 + TypeScript + Tailwind CSS + TipTap |
| 后端 | FastAPI + SQLAlchemy + Alembic |
| 数据库 | PostgreSQL 16 |
| 部署 | Docker Compose + Nginx |

## 项目结构

```
resumeforge/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/   # API 路由
│   │   ├── core/     # 配置、数据库、安全
│   │   ├── models/   # SQLAlchemy 模型
│   │   ├── schemas/  # Pydantic Schema
│   │   ├── services/ # 业务逻辑
│   │   └── repositories/  # 数据访问层
│   └── alembic/      # 数据库迁移
├── frontend/         # Next.js 前端
│   └── src/
│       ├── app/      # 页面路由
│       ├── components/  # 组件
│       └── lib/      # 工具库
├── nginx/            # Nginx 配置
├── docker-compose.yml
└── .env.example
```

## 开发

```bash
# 后端
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `POSTGRES_PASSWORD` | 数据库密码 | resumeforge_dev_2024 |
| `SECRET_KEY` | JWT 签名密钥 | 需修改 |
| `ENCRYPTION_KEY` | API Key 加密密钥（32 字节 hex） | 需修改 |
| `AUTO_MIGRATE` | 启动时自动迁移 | true |
