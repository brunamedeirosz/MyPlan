import os
from pathlib import Path
from tempfile import gettempdir

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403

DEBUG = False
if not os.environ.get('SECRET_KEY') or len(os.environ['SECRET_KEY']) < 50:
    raise ImproperlyConfigured('Produção exige SECRET_KEY aleatória com ao menos 50 caracteres.')
if not os.environ.get('ALLOWED_HOSTS') or '*' in ALLOWED_HOSTS:  # noqa: F405
    raise ImproperlyConfigured('Produção exige ALLOWED_HOSTS explícito, sem wildcard.')
if os.environ.get('DB_ENGINE') != 'postgresql':
    raise ImproperlyConfigured('Produção exige PostgreSQL persistente (DB_ENGINE=postgresql).')

ENABLE_LEGACY_API = False
DATABASES['default']['CONN_MAX_AGE'] = 60  # noqa: F405
DATABASES['default']['CONN_HEALTH_CHECKS'] = True  # noqa: F405
DATABASES['default']['OPTIONS'] = {'sslmode': os.getenv('DB_SSLMODE', 'require')}  # noqa: F405
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if origin.strip()]
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 3600
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = False
# Preload exige adesão explícita do domínio; não inscrever domínios de terceiros.
SILENCED_SYSTEM_CHECKS = ['security.W021']
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if origin.strip()]
# Ativar somente atrás de proxy que substitui o cabeçalho enviado pelo cliente.
if os.getenv('TRUST_PROXY_HTTPS', 'false').lower() == 'true':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

MIDDLEWARE = list(MIDDLEWARE)  # noqa: F405
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
WHITENOISE_ROOT = BASE_DIR.parent / 'frontend' / 'dist'  # noqa: F405
WHITENOISE_INDEX_FILE = True

# Compartilhado pelos workers da mesma instância. Escala horizontal exige cache externo.
CACHES = {'default': {
    'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
    'LOCATION': os.getenv('CACHE_LOCATION', str(Path(gettempdir()) / 'myplan-cache')),
}}
REST_FRAMEWORK = {**REST_FRAMEWORK, 'NUM_PROXIES': int(os.getenv('NUM_PROXIES', '1'))}  # noqa: F405
LOGGING = {
    'version': 1, 'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}
