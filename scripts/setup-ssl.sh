#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# BidKaro — Let's Encrypt SSL Automated Setup Script
# Usage: ./scripts/setup-ssl.sh yourdomain.com [email@domain.com]
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[38;5;82m"
BLUE="\033[38;5;39m"
RED="\033[38;5;196m"
NC="\033[0m"

DOMAIN="${1:-}"
EMAIL="${2:-admin@$DOMAIN}"

if [ -z "$DOMAIN" ]; then
  echo -e "${RED}${BOLD}Error:${NC} Domain name is required."
  echo "Usage: ./scripts/setup-ssl.sh yourdomain.com [email@domain.com]"
  exit 1
fi

echo -e "${BLUE}${BOLD}[BidKaro SSL]${NC} Provisioning Let's Encrypt SSL for: ${DOMAIN}"

# 1. Install certbot if missing
if ! command -v certbot &> /dev/null; then
  echo -e "${BLUE}${BOLD}[BidKaro SSL]${NC} Installing certbot..."
  sudo apt-get update && sudo apt-get install -y certbot
fi

# 2. Stop container on port 80 temporarily for certbot standalone verification
echo -e "${BLUE}${BOLD}[BidKaro SSL]${NC} Temporarily pausing frontend container for ACME challenge..."
docker compose -f docker-compose.prod.yml stop frontend || true

# 3. Request Certificate
sudo certbot certonly --standalone \
  --preferred-challenges http \
  -d "${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}"

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"

if [ ! -d "${CERT_PATH}" ]; then
  echo -e "${RED}${BOLD}[BidKaro SSL ✗]${NC} Certificate generation failed."
  docker compose -f docker-compose.prod.yml start frontend
  exit 1
fi

echo -e "${GREEN}${BOLD}[BidKaro SSL ✓]${NC} Certificate obtained successfully!"

# 4. Copy certificates into project's nginx/certs volume
mkdir -p nginx/certs
sudo cp "${CERT_PATH}/fullchain.pem" nginx/certs/fullchain.pem
sudo cp "${CERT_PATH}/privkey.pem" nginx/certs/privkey.pem
sudo chmod 644 nginx/certs/fullchain.pem
sudo chmod 600 nginx/certs/privkey.pem

# 5. Generate SSL-enabled Nginx Configuration
cat > nginx.conf << EOF
# BidKaro Production Nginx Configuration (HTTP -> HTTPS Redirect + SSL Termination)

server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 100M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml image/svg+xml;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /assets/ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://api:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_cache off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /storage/ {
        proxy_pass http://api:8000;
        proxy_set_header Host \$host;
        proxy_read_timeout 300s;
    }
}
EOF

# Update frontend ports in docker-compose.prod.yml if needed
docker compose -f docker-compose.prod.yml restart frontend

echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD} ✓ SSL Configured! Access your platform at: https://${DOMAIN}${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
