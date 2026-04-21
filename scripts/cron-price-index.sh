#!/bin/bash
# ========================================
# CatalogSmart - Price Index Hourly Refresh
# ========================================
# Hits the /api/cron/refresh-price-index endpoint to invalidate + warm
# the standard-basket cache and log a staleness warning if scrapers died.
#
# Install on VPS:
#   crontab -e
#   0 * * * * /var/www/catalogsmart.ro/scripts/cron-price-index.sh >> /var/log/catalogsmart-price-index.log 2>&1
#
# Env (reads from .env.production if present):
#   PRICE_INDEX_URL   default: http://127.0.0.1:3000/api/cron/refresh-price-index
#   CRON_SECRET       required — must match the value the Next.js app reads
#
# Exit codes:
#   0 = success (HTTP 2xx)
#   1 = config error (missing CRON_SECRET)
#   2 = HTTP failure (non-2xx or network error)

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/catalogsmart.ro}"

# Load env from the app's .env.production so we share CRON_SECRET with Next.js
if [ -f "${APP_DIR}/.env.production" ]; then
    set -a
    # shellcheck disable=SC1091
    . "${APP_DIR}/.env.production"
    set +a
fi

URL="${PRICE_INDEX_URL:-http://127.0.0.1:3000/api/cron/refresh-price-index}"
SECRET="${CRON_SECRET:-}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -z "${SECRET}" ]; then
    echo "[${TS}] ERROR: CRON_SECRET not set (check ${APP_DIR}/.env.production)" >&2
    exit 1
fi

# 20s connect timeout, 55s total — endpoint's maxDuration is 60s
RESPONSE="$(mktemp)"
trap 'rm -f "${RESPONSE}"' EXIT

HTTP_CODE="$(curl -fsS \
    --connect-timeout 20 \
    --max-time 55 \
    -H "Authorization: Bearer ${SECRET}" \
    -H "User-Agent: catalogsmart-cron/1.0" \
    -o "${RESPONSE}" \
    -w "%{http_code}" \
    "${URL}" || echo "000")"

if [ "${HTTP_CODE}" = "200" ]; then
    # Single-line JSON → grep out key fields for the log
    BODY="$(tr -d '\n' < "${RESPONSE}" | head -c 500)"
    echo "[${TS}] OK ${HTTP_CODE} ${BODY}"
    exit 0
else
    BODY="$(tr -d '\n' < "${RESPONSE}" | head -c 500)"
    echo "[${TS}] FAIL http=${HTTP_CODE} body=${BODY}" >&2
    exit 2
fi
