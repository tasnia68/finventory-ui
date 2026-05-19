#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_ROOT="${WORKSPACE_ROOT}/tmp/migration-backups/${TIMESTAMP}"

mkdir -p "${BACKUP_ROOT}"

latest_sql="$(find "${WORKSPACE_ROOT}/tmp" -maxdepth 2 -type f \( -name '*.sql' -o -name '*.dump' \) | sort | tail -n 1 || true)"
if [[ -n "${latest_sql}" ]]; then
  cp "${latest_sql}" "${BACKUP_ROOT}/"
fi

if [[ -d "${WORKSPACE_ROOT}/minio-data" ]]; then
  tar -C "${WORKSPACE_ROOT}" -czf "${BACKUP_ROOT}/minio-data.tgz" minio-data
fi

if [[ -d "${WORKSPACE_ROOT}/product-images" ]]; then
  tar -C "${WORKSPACE_ROOT}" -czf "${BACKUP_ROOT}/product-images.tgz" product-images
fi

echo "Created local migration backup at ${BACKUP_ROOT}"