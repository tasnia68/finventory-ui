#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root."
  exit 1
fi

APP_ROOT="${APP_ROOT:-/opt/masterinventory}"
ENV_DIR="${ENV_DIR:-/etc/masterinventory}"

apt-get update
apt-get install -y ca-certificates curl rsync docker.io docker-compose-v2

systemctl enable --now docker

install -d -m 0755 "${APP_ROOT}"
install -d -m 0750 "${ENV_DIR}"

if [[ ! -f "${ENV_DIR}/stack.env" ]]; then
  install -m 0600 "$(dirname "${BASH_SOURCE[0]}")/docker.env.example" "${ENV_DIR}/stack.env"
  echo "Created ${ENV_DIR}/stack.env from docker.env.example. Update secrets before deployment if needed."
fi

echo "Docker host bootstrap complete."