#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-/etc/masterinventory/stack.env}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_command docker
require_command curl

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing environment file: ${ENV_FILE}"
  exit 1
fi

if grep -Eqi 'replace-me|change-me|example\.com' "${ENV_FILE}"; then
  echo "Update ${ENV_FILE} with real secrets before deploying."
  exit 1
fi

pushd "${SCRIPT_DIR}" >/dev/null
docker compose --env-file "${ENV_FILE}" up -d --build
popd >/dev/null

for attempt in $(seq 1 24); do
  if curl -fsS http://127.0.0.1/ >/dev/null; then
    echo "Gateway health check passed."
    echo "Docker deployment completed successfully."
    exit 0
  fi
  sleep 5
done

echo "Deployment finished building containers, but the gateway did not become healthy in time."
exit 1