FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api/
RUN npm run build

FROM python:3.13-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/backend
COPY backend/requirements*.txt ./
RUN pip install --no-cache-dir -r requirements-production.txt
COPY backend/ ./
COPY --from=frontend /build/dist /app/frontend/dist
RUN DJANGO_SETTINGS_MODULE=config.production DJANGO_DEBUG=false \
    SECRET_KEY=build-only-placeholder-never-a-runtime-secret-01234567890123456789 \
    ALLOWED_HOSTS=localhost DB_ENGINE=postgresql CACHE_LOCATION=/tmp/myplan-build-cache \
    python manage.py collectstatic --noinput \
    && useradd --create-home myplan \
    && chown -R myplan:myplan /app
USER myplan
ENV DJANGO_SETTINGS_MODULE=config.production DJANGO_DEBUG=false
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --access-logfile - --error-logfile -"]
