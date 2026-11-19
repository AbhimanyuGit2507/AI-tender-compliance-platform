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

# Copy backend application source
COPY backend/ .

# Pre-create upload directory
RUN mkdir -p /app/uploads

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
