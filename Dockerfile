# ────────────────────────────────────────────────────────────────
# BidKaro — Backend Production Dockerfile (Root Context)
# Python 3.12 Slim with optimized C extensions & FastEmbed ONNX
# ────────────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# System deps: PostgreSQL client, build tools, curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc g++ build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps in isolated cache layer
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-cache FastEmbed ONNX model so startup is instant (0ms download)
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5')"

# Copy backend application source
COPY backend/ .

# Pre-create upload directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
