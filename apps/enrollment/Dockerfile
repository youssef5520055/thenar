# Multi-stage hardened build for Thenar Biometric Calibration Microservice
FROM python:3.12.9-slim-bookworm AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Install non-root application user
RUN groupadd -r thenar && useradd -r -g thenar -d /app -s /sbin/nologin thenar

# Install pinned dependencies
COPY apps/enrollment/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy application source
COPY apps/enrollment /app/apps/enrollment

RUN chown -R thenar:thenar /app

USER thenar

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["python", "-m", "uvicorn", "apps.enrollment.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
