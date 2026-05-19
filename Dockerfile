# =============================================================================
# Stage 1: Builder — install dependencies in a clean environment
# =============================================================================
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /build

# Install system dependencies needed for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install wheel
RUN pip install --upgrade pip wheel

# Copy requirements first for layer caching
COPY requirements.txt .

# Install all Python dependencies into a local prefix
RUN pip install --prefix=/install --no-warn-script-location -r requirements.txt


# =============================================================================
# Stage 2: Production — lean final image
# =============================================================================
FROM python:3.11-slim AS production

# Labels for image metadata
LABEL maintainer="Your Own API" \
      version="1.0.0" \
      description="Your Own API Gateway — Production Image"

# Create a non-root user for security
RUN groupadd -r apiuser && useradd -r -g apiuser apiuser

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Set working directory
WORKDIR /app

# Copy application source code
COPY ./app ./app
COPY ./alembic ./alembic
COPY alembic.ini .
COPY requirements.txt .

# Create log, data, and static directories and set permissions
RUN mkdir -p /app/logs /app/data /app/static /app/static/generated_images /app/static/generated_audio \
    && chown -R apiuser:apiuser /app/logs /app/data /app/static

# Switch to non-root user
USER apiuser

# Expose application port
EXPOSE 8000

# Health check — Docker will mark container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Entrypoint: run database migrations then start Gunicorn with Uvicorn workers
CMD ["sh", "-c", "alembic upgrade head && gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --keep-alive 5 \
    --log-level info \
    --access-logfile /app/logs/access.log \
    --error-logfile /app/logs/error.log"]
