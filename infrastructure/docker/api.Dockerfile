# api.Dockerfile
# This builds our FastAPI Python backend image

# ============================================
# STAGE 1: BASE
# We use multi-stage builds to keep image small
# ============================================
FROM python:3.11-slim AS base
# python:3.11-slim = Python 3.11 on minimal Linux
# "slim" removes unnecessary tools = smaller image
# smaller image = faster deploys, less storage

# Set working directory inside container
# All commands after this run from /app
WORKDIR /app

# Set Python environment variables
ENV PYTHONDONTWRITEBYTECODE=1
# Prevents Python from writing .pyc files
# We don't need compiled files in container

ENV PYTHONUNBUFFERED=1
# Forces Python to print logs immediately
# Without this: logs appear in batches, hard to debug

# ============================================
# STAGE 2: DEPENDENCIES
# Install requirements separately from code
# WHY: Docker caches each layer
# If code changes but requirements don't →
# Docker skips reinstalling packages (faster builds)
# ============================================
FROM base AS dependencies

# Copy ONLY requirements first
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 -r requirements.txt
# --no-cache-dir = don't store pip cache in image
# keeps image size smaller

# ============================================
# STAGE 3: DEVELOPMENT
# Hot reload enabled — code changes reflect instantly
# ============================================
FROM dependencies AS development

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--reload", "--port", "8000"]

# ============================================
# STAGE 4: PRODUCTION
# Optimized for production deployment
# ============================================
FROM dependencies AS production

COPY . .

EXPOSE 8000

CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120", "--keep-alive", "5", "--access-logfile", "-", "--error-logfile", "-"]