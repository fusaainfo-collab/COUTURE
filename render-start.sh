#!/usr/bin/env bash
set -euo pipefail

echo "Couture API: starting from $(pwd)"
echo "Couture API: Python $(python --version)"

cd "$(dirname "$0")/backend"

echo "Couture API: running Django check"
python manage.py check

echo "Couture API: applying migrations"
python manage.py migrate --noinput

echo "Couture API: starting Gunicorn on port ${PORT:-8000}"
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers "${WEB_CONCURRENCY:-1}" --log-file -
