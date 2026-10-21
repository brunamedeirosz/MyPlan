from .settings import *  # noqa: F403

# Banco isolado: os testes de navegador nao alteram os dados locais.
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'e2e.sqlite3'}}  # noqa: F405

CORS_ALLOWED_ORIGINS = ['http://127.0.0.1:5175']
REST_FRAMEWORK = {**REST_FRAMEWORK, 'DEFAULT_THROTTLE_RATES': {'login': '10000/min', 'registration': '10000/hour'}}  # noqa: F405
