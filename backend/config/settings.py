import os
import sys
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlparse

from corsheaders.defaults import default_headers
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def csv_env(name, default=""):
    raw_value = os.getenv(name) or default
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def unique(items):
    return list(dict.fromkeys(item for item in items if item))


def render_allowed_hosts():
    hosts = []
    render_hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME", "")
    render_url = os.getenv("RENDER_EXTERNAL_URL", "")
    render_service_name = os.getenv("RENDER_SERVICE_NAME", "")

    if render_hostname:
        hosts.append(render_hostname)
    if render_url:
        parsed = urlparse(render_url)
        if parsed.hostname:
            hosts.append(parsed.hostname)
    if render_service_name:
        hosts.append(f"{render_service_name}.onrender.com")

    return hosts


def is_migration_command():
    migration_commands = {"dbshell", "migrate", "showmigrations", "sqlmigrate"}
    return any(command in migration_commands for command in sys.argv[1:])


def database_from_url(value):
    parsed = urlparse(value)
    if parsed.scheme not in ["postgres", "postgresql"]:
        raise ValueError("DATABASE_URL doit utiliser postgres:// ou postgresql://.")

    query = dict(parse_qsl(parsed.query))
    options = {"sslmode": query.get("sslmode", "require")}
    uses_pgbouncer = query.get("pgbouncer", "").lower() == "true"

    config = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path.lstrip("/") or "postgres"),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
        "OPTIONS": options,
    }

    if uses_pgbouncer:
        config["CONN_MAX_AGE"] = 0
        config["DISABLE_SERVER_SIDE_CURSORS"] = True

    return config


SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = unique(
    csv_env("ALLOWED_HOSTS", "127.0.0.1,localhost,testserver,.onrender.com")
    + render_allowed_hosts()
)


DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.clients",
    "apps.measurements",
    "apps.appointments",
    "apps.analytics",
    "apps.notifications",
    "apps.tailors",
    "apps.orders",
    "apps.payments",
    "apps.dashboard",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


DATABASE_URL = os.getenv("DATABASE_URL", "")
DIRECT_URL = os.getenv("DIRECT_URL", "")
ACTIVE_DATABASE_URL = DIRECT_URL if is_migration_command() and DIRECT_URL else DATABASE_URL
POSTGRES_DB = os.getenv("POSTGRES_DB", "")
if ACTIVE_DATABASE_URL:
    DATABASES = {
        "default": database_from_url(ACTIVE_DATABASE_URL)
    }
elif POSTGRES_DB:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": POSTGRES_DB,
            "USER": os.getenv("POSTGRES_USER", ""),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Niamey"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = csv_env(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002,https://couture-web.onrender.com",
)
CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-workshop-id",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": [
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Atelier Couture ERP API",
    "DESCRIPTION": "API REST partagee par la web app et les futures applications Android.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
