#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REMOTE="${1:-sanzar@20.174.8.47}"
REMOTE_USER="${REMOTE%%@*}"
APP_DOMAIN="${APP_DOMAIN:-logistra.me}"
VITE_API_URL="${VITE_API_URL:-/api/v1}"

if [[ "${REMOTE}" != *"@"* ]]; then
  REMOTE_USER="${USER}"
fi

REMOTE_ROOT="${REMOTE_ROOT:-/home/${REMOTE_USER}/masterinventory-src}"

ssh "${REMOTE}" "mkdir -p '${REMOTE_ROOT}'"

rsync -az --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='target/' \
  --exclude='.DS_Store' \
  "${WORKSPACE_ROOT}/inventory/" "${REMOTE}:${REMOTE_ROOT}/inventory/"

rsync -az --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='.DS_Store' \
  "${WORKSPACE_ROOT}/finventory-ui/" "${REMOTE}:${REMOTE_ROOT}/finventory-ui/"

rsync -az --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='.DS_Store' \
  "${WORKSPACE_ROOT}/storefront-ui/" "${REMOTE}:${REMOTE_ROOT}/storefront-ui/"

rsync -az --delete \
  --exclude='.DS_Store' \
  "${WORKSPACE_ROOT}/deploy/" "${REMOTE}:${REMOTE_ROOT}/deploy/"

ssh "${REMOTE}" "sudo APP_USER='${REMOTE_USER}' APP_DOMAIN='${APP_DOMAIN}' bash '${REMOTE_ROOT}/deploy/bootstrap-server.sh'"
ssh "${REMOTE}" "cd '${REMOTE_ROOT}' && VITE_API_URL='${VITE_API_URL}' bash deploy/remote-deploy.sh"
