FROM python:3.12-slim

WORKDIR /app

# 系统依赖（WeasyPrint 需要）
# 添加重试机制和必要的 CA 证书
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 WeasyPrint 运行时依赖（分层安装，便于缓存和调试）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi8 \
    libcairo2 \
    libgobject-2.0-0 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 构建时依赖（单独层，生产镜像可通过 multi-stage 移除）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi-dev \
    gcc \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 清理构建时依赖（减小镜像体积）
RUN apt-get purge -y --auto-remove \
    libffi-dev \
    gcc \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]