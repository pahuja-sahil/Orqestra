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
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt
# --no-cache-dir = don't store pip cache in image
# keeps image size smaller

# ============================================
# STAGE 3: DEVELOPMENT
# Used when ENVIRONMENT=development
# Hot reload enabled — code changes reflect instantly
# ============================================
FROM dependencies AS development

# Copy all application code
COPY . .

# Expose port 8000 to Docker network
EXPOSE 8000

# Start FastAPI with hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--reload", "--port", "8000"]
# main:app = file "main.py", variable "app"
# --host 0.0.0.0 = accept connections from anywhere in Docker network
# --reload = restart server when code changes (dev only)
# WITHOUT 0.0.0.0: container only accepts connections from itself