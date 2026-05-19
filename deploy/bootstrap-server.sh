#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo."
  exit 1
fi

APP_USER="${APP_USER:-sanzar}"
APP_GROUP="${APP_GROUP:-${APP_USER}}"
APP_DOMAIN="${APP_DOMAIN:-logistra.me}"
APP_ROOT="${APP_ROOT:-/srv/masterinventory}"
WEB_ROOT="${WEB_ROOT:-/var/www/masterinventory}"
STOREFRONT_ROOT="${STOREFRONT_ROOT:-${WEB_ROOT}/storefront}"
BACKOFFICE_ROOT="${BACKOFFICE_ROOT:-${WEB_ROOT}/inventory}"
ENV_DIR="${ENV_DIR:-/etc/masterinventory}"
ENV_FILE="${ENV_FILE:-${ENV_DIR}/backend.env}"
SERVICE_NAME="${SERVICE_NAME:-masterinventory-backend}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-masterinventory}"

install_nodejs() {
  if command -v node >/dev/null 2>&1; then
    local node_major
    node_major="$(node -p 'process.versions.node.split(`.`)[0]')"
    if [[ "${node_major}" -ge 20 ]]; then
      return
    fi
  fi

  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
}

apt-get update
apt-get install -y openjdk-17-jdk nginx curl ca-certificates gnupg rsync
install_nodejs

install -d -o "${APP_USER}" -g "${APP_GROUP}" "${APP_ROOT}/src"
install -d -o "${APP_USER}" -g "${APP_GROUP}" "${APP_ROOT}/backend"
install -d -o "${APP_USER}" -g "${APP_GROUP}" "${STOREFRONT_ROOT}"
install -d -o "${APP_USER}" -g "${APP_GROUP}" "${BACKOFFICE_ROOT}"
install -d -m 0750 -o root -g "${APP_GROUP}" "${ENV_DIR}"

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=MasterInventory Spring Boot backend
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${APP_ROOT}/backend
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/java -jar ${APP_ROOT}/backend/inventory-system.jar
SuccessExitStatus=143
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > "/etc/nginx/sites-available/${NGINX_SITE_NAME}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_DOMAIN};

    root ${STOREFRONT_ROOT};
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location = /inventory {
        return 301 /inventory/;
    }

    location = /inevtory {
        return 301 /inventory/;
    }

    location /inventory/ {
        root ${WEB_ROOT};
        try_files \$uri \$uri/ /inventory/index.html;
    }

    location /inevtory/ {
        root ${WEB_ROOT};
        try_files \$uri \$uri/ /inventory/index.html;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf "/etc/nginx/sites-available/${NGINX_SITE_NAME}" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
rm -f /etc/nginx/sites-enabled/default

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<EOF
SPRING_PROFILES_ACTIVE=deploy
SERVER_PORT=8080

DB_URL=jdbc:postgresql://replace-me:5432/inventory_db
DB_USERNAME=replace-me
DB_PASSWORD=replace-me

MINIO_URL=https://replace-me
MINIO_ACCESS_KEY=replace-me
MINIO_SECRET_KEY=replace-me
MINIO_BUCKET=inventory-products

APP_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
APP_BOOTSTRAP_ADMIN_PASSWORD=ChangeMe123!
APP_BOOTSTRAP_ADMIN_FIRSTNAME=System
APP_BOOTSTRAP_ADMIN_LASTNAME=Admin
APP_BOOTSTRAP_ADMIN_TENANTID=default-tenant

APP_MAIL_FROM=noreply@inventory-system.com
MAIL_HOST=localhost
MAIL_PORT=25
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_SMTP_AUTH=false
MAIL_SMTP_STARTTLS_ENABLE=false
EOF
  chown root:"${APP_GROUP}" "${ENV_FILE}"
  chmod 640 "${ENV_FILE}"
fi

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl enable nginx
nginx -t
systemctl restart nginx

echo "Server bootstrap complete. Update ${ENV_FILE} before the first backend restart if the placeholders are still present."
