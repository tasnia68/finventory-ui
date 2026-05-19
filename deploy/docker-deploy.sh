#!/usr/bin/env bash

set -euo pipefail

# deploy/ now lives at finventory-ui/deploy, so the workspace root
# (containing inventory/, finventory-ui/, storefront-ui/) is two levels up.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REMOTE="${REMOTE:-${1:-root@127.0.0.1}}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/masterinventory-src}"

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

# deploy/ is now part of finventory-ui/ and is carried by the rsync above
# (it has no node_modules/dist/.git so nothing is excluded). Remove any stale
# top-level deploy/ from the pre-move layout so the old path can't be used.
ssh "${REMOTE}" "rm -rf '${REMOTE_ROOT}/deploy'"

ssh "${REMOTE}" "bash '${REMOTE_ROOT}/finventory-ui/deploy/docker-bootstrap-server.sh'"
ssh "${REMOTE}" "cd '${REMOTE_ROOT}' && ENV_FILE='/etc/masterinventory/stack.env' bash finventory-ui/deploy/docker-remote-deploy.sh"