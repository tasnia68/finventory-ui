#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_SOURCE="${WORKSPACE_ROOT}/inventory"
FRONTEND_SOURCE="${WORKSPACE_ROOT}/finventory-ui"
STOREFRONT_SOURCE="${WORKSPACE_ROOT}/storefront-ui"
APP_ROOT="${APP_ROOT:-/srv/masterinventory}"
WEB_ROOT="${WEB_ROOT:-/var/www/masterinventory}"
STOREFRONT_ROOT="${STOREFRONT_ROOT:-${WEB_ROOT}/storefront}"
BACKOFFICE_ROOT="${BACKOFFICE_ROOT:-${WEB_ROOT}/inventory}"
SERVICE_NAME="${SERVICE_NAME:-masterinventory-backend}"
ENV_FILE="${ENV_FILE:-/etc/masterinventory/backend.env}"
VITE_API_URL="${VITE_API_URL:-/api/v1}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_command sudo
require_command node
require_command npm
require_command java
require_command rsync
require_command curl

if ! sudo test -f "${ENV_FILE}"; then
  sudo install -D -m 0640 -o root -g "$(id -gn)" "${SCRIPT_DIR}/backend.env.example" "${ENV_FILE}"
  echo "Created ${ENV_FILE} from deploy/backend.env.example. Update it with real PostgreSQL and MinIO credentials, then rerun deployment."
  exit 1
fi

if sudo grep -Eqi 'db-host|inventory_user|change-me|minio\.example\.com|replace-me' "${ENV_FILE}"; then
  echo "Update ${ENV_FILE} with real PostgreSQL and MinIO credentials before deploying."
  exit 1
fi

# --- Build and publish frontend first so UI fixes go live immediately ---
pushd "${FRONTEND_SOURCE}" >/dev/null
npm ci
VITE_API_URL="${VITE_API_URL}" VITE_BASE_PATH="/inventory/" npm run build
popd >/dev/null

pushd "${STOREFRONT_SOURCE}" >/dev/null
npm ci
VITE_API_URL="${VITE_API_URL}" npm run build
popd >/dev/null

sudo install -d -m 0755 "${STOREFRONT_ROOT}" "${BACKOFFICE_ROOT}"
sudo rsync -a --delete "${STOREFRONT_SOURCE}/dist/" "${STOREFRONT_ROOT}/"
sudo rsync -a --delete "${FRONTEND_SOURCE}/dist/" "${BACKOFFICE_ROOT}/"
sudo systemctl reload nginx
echo "Storefront and backoffice deployed and nginx reloaded."

# --- Build and publish backend ---
pushd "${BACKEND_SOURCE}" >/dev/null
chmod +x mvnw
# Cap Maven heap to 512 MB to avoid OOM-kill on small VMs
export MAVEN_OPTS="${MAVEN_OPTS:--Xmx512m -Xms256m}"
./mvnw -Dmaven.test.skip=true clean package
BACKEND_JAR="$(find target -maxdepth 1 -type f -name '*.jar' ! -name '*original*.jar' | head -n 1)"
if [[ -z "${BACKEND_JAR}" ]]; then
  echo "No Spring Boot jar was produced."
  exit 1
fi
popd >/dev/null

sudo install -d -m 0755 "${APP_ROOT}/backend"
sudo install -m 0644 "${BACKEND_SOURCE}/${BACKEND_JAR}" "${APP_ROOT}/backend/inventory-system.jar"

sudo systemctl restart "${SERVICE_NAME}"

sudo systemctl is-active --quiet "${SERVICE_NAME}"
curl -fsS http://127.0.0.1/ >/dev/null

echo "Deployment completed successfully."
