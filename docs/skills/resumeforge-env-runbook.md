# Skill: resumeforge-env-runbook（环境与联测手册）

> 适用场景：在本仓库跑联测（E2E）、排查"改了代码没生效"、登录/注册 500、权限拒绝类报错。
> 沉淀自 2026-09 的实际排查：44 条 E2E 连环失败 → 定位为容器镜像过期 + bcrypt 不兼容。

---

## 0. 快速诊断顺序：500 到底出在哪一层

前端所有 API 请求走同源代理 `frontend/src/app/api/v1/[...path]/route.ts`，所以登录 500 有三个可能层级，**按顺序 curl 排除**：

```bash
# 1) 后端直连 —— 排除后端自身
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"x@test.com","password":"wrong"}' -w "\nHTTP %{http_code}\n"
# 期望：401 + {"detail":"邮箱或密码错误"}

# 2) 代理层 —— 排除 Next.js 路由
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"x@test.com","password":"wrong"}' -w "\nHTTP %{http_code}\n"
# 期望：同上。若这里 500 而第 1 步正常 → 代理问题（见 §1）

# 3) 浏览器层 —— 只有前两层都正常才需要看
# 打开 DevTools Network，确认请求 URL 与报文
```

后端路由清单：`curl -s http://localhost:8000/openapi.json`。
注意后端没有 `/health` 路由，404 不代表后端挂了。

---

## 1. 铁律：容器跑的是镜像里的编译产物

`frontend/Dockerfile` 在构建期执行 `npm run build`，容器 `CMD ["npm","start"]`。
**改了 `frontend/src/**` 的任何代码，容器里都不会变，必须重建：**

```bash
docker compose build frontend && docker compose up -d frontend
```

（`docker-compose.yml` 里 `./frontend:/app` 的源码挂载会骗到你——源码变了，但 `.next`
编译产物来自匿名卷/镜像，`npm start` 读的是旧产物。后端因 `--reload` 挂载源码所以
代码会热更，但**依赖变化必须重建镜像**。）

历史教训：代理路由写死 `127.0.0.1:8000` 在容器内指向 frontend 容器自己 → 所有代理
请求 500。现修复为读 `process.env.BACKEND_URL`，compose 中配
`BACKEND_URL: http://backend:8000`。改代理代码后务必重建 frontend 镜像并提交。

### docker 不可用时的降级验证栈（sandbox/socket 被禁时）

```bash
# 后端：本地 venv + 宿主机可达的 postgres（密码在 .env 的 POSTGRES_PASSWORD）
cd backend
DATABASE_URL="postgresql+asyncpg://resumeforge:<密码>@localhost:5432/resumeforge" \
  .venv/bin/uvicorn app.main:app --port 8010

# 前端：仓库副本（绕过 nobody 属主文件，见 §3），代理指向本地后端
cp -r src next.config.js postcss.config.js tailwind.config.js tailwind.config.ts \
   tsconfig.json package.json tests <副本目录>/
ln -sfn $(pwd)/frontend/node_modules <副本目录>/node_modules
cd <副本目录> && BACKEND_URL=http://127.0.0.1:8010 PORT=3002 npm run dev
```

⚠️ 注意：本环境的 `/tmp` 在不同 bash 调用之间**不共享**，副本和产物一律放仓库内
（如 `.e2e-frontend/`，已 gitignore 的目录或自行加入 ignore）。

---

## 2. E2E（Playwright）运行手册

```bash
cd frontend
# 默认配置要求写 playwright-report/，若目录属主非当前用户，用 ci 配置：
E2E_BASE_URL=http://localhost:3002 \
E2E_OUTPUT_DIR=$PWD/.pw-results \
npx playwright test --config=playwright.ci.config.ts --project=chromium
```

要点与陷阱：

- **`playwright.ci.config.ts`** 存在的意义：原 `playwright-report/`、`test-results/`
  属主是 nobody；且 `...base` 展开 config 时，`base.use` 里的
  `baseURL: http://localhost:3000` 会**覆盖**顶层的 `baseURL`——必须写在 `use` 对象里
  （此坑已修，改动 config 时别把 baseURL 挪回顶层）。
- 依赖外部免费 LLM 的用例（`resumes.spec.ts` 的"完整流程"）在并发全量跑时会偶发限流
  超时，**单跑通过即视为通过**，不算回归。
- fixtures 每个测试创建独立随机用户（`uniqueEmail()`）；断言用户信息时用 fixture 返回
  的 email，**不要硬编码**（曾因硬编码 `user@example.com` 断言失败）。
- 后端单测与 E2E 相互独立：`cd backend && .venv/bin/python -m pytest -q`
  （内存/文件 SQLite，116 条，覆盖率门槛 85%）。

### 联测常见故障 → 根因速查

| 症状 | 根因 | 处置 |
| --- | --- | --- |
| 代理层 500，后端直连正常 | frontend 镜像过期（见 §1） | rebuild frontend |
| 注册/改密码 500，登录"能查库" | bcrypt 5.x + passlib 1.7.4 不兼容（见 §4） | 锁 `bcrypt<4.1`，rebuild backend |
| 大量 E2E 失败于登录后页面 | 上述任一条导致 fixture 注册失败 | 先 curl 三层定位 |
| 控制台 `IntlError: MISSING_MESSAGE` | i18n key 只加了一个语言 | 双语补齐（见 §5） |
| `EACCES` 写 report/objects/messages | nobody 属主文件（见 §3） | 降级方案或 chown |

---

## 3. nobody 属主文件（容器挂载残留）

仓库中反复出现 `nobody:nogroup` 属主文件/目录（疑似 docker 挂载产物）：
`.git/objects/*`、`.next/`、`playwright-report/`、`test-results/`、`src/messages/` 等。

```bash
# 识别
find . -path ./node_modules -prune -o ! -writable -print 2>/dev/null
```

**根治（有 sudo 时）：**

```bash
sudo chown -R $(id -u):$(id -g) .
# .git 修复后归并对象：
git repack -a -d && rm -rf .git/objects-new
```

**无 sudo 时的降级手段（已验证有效）：**

- 改不了文件 → 在仓库内建副本目录（§1）。
- `.git/objects` 部分子目录不可写、`git commit` 报
  `insufficient permission for adding an object` →

  ```bash
  mkdir -p .git/objects-new/info
  echo "$(pwd)/.git/objects" > .git/objects-new/info/alternates
  export GIT_OBJECT_DIRECTORY="$(pwd)/.git/objects-new"
  git add ... && git commit -m "..." && git push   # push 会带上全部可达对象
  ```
  推完后提醒有 sudo 的人按上面"根治"归并。

---

## 4. passlib + bcrypt 版本锁定（防回归）

- `requirements.txt` 必须保持：`bcrypt>=4.0.0,<4.1`。
- 原理：passlib 1.7.4 依赖 `bcrypt.__about__.__version__` 做探测，bcrypt ≥4.1 移除了
  `__about__`；探测失败后走错误分支，`bcrypt.hash()` 直接抛
  `ValueError: password cannot be longer than 72 bytes` → 所有写密码路径 500。
- **诡异但典型的症状分布**：登录"看起来正常"（用户不存在时短路、不调
  `bcrypt.verify`）、注册/改密码 500、后端单测全绿（本地 venv 恰好是 4.0.1）、
  容器里全挂（构建时 `pip install -r` 拉到新 major）。
- 复现/验证方法（升级任何密码相关依赖前先做）：

  ```bash
  python3 -m venv /tmp/probe && /tmp/probe/bin/pip install "bcrypt>=5" passlib==1.7.4
  /tmp/probe/bin/python -c "from passlib.hash import bcrypt; print(bcrypt.hash('x'))"
  ```

- 通用模式：**依赖只写下限（`>=`）时，容器镜像构建时间 ≠ 本地 venv，二者可能拿到
  不同 major。凡是涉及密码/加密/序列化的依赖，发现关键行为"容器与本地不一致"，
  第一件事是对比两侧 `pip freeze`。**

---

## 5. i18n 约定

- 文案在 `frontend/src/messages/zh-CN.json` 与 `en-US.json`，**必须双语同步添加**，
  否则运行时控制台报 `IntlError: MISSING_MESSAGE`（构建不报错，极易漏）。
- 验证：E2E 跑 `pages.spec.ts` 的"已登录用户访问各页面无控制台错误"，或
  `grep -rn MISSING_MESSAGE` 浏览器控制台输出。
- 注意 `src/messages/` 可能是 nobody 属主（§3），补 key 前先确认可写。

---

## 6. 环境事实速查

- 数据库密码以 `.env` 的 `POSTGRES_PASSWORD` 为准（compose 自动读 `.env`，两处默认值
  不一致时以 `.env` 为准；曾因假设默认值 `resumeforge_dev_2024` 而连库失败）。
- postgres 数据在命名卷 `postgres_data`，`POSTGRES_PASSWORD` 只在首次初始化生效；
  改密码要进容器 `ALTER USER`，光改 `.env` 没用。
- 后端无 `/health`；探活用 `/openapi.json`。
- 仓库根有 `dev.db`/`test.db`（SQLite 测试残留），不要提交。
