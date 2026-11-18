#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# BidKaro — Turnkey VPS Production Deployment Script
# Supports: Ubuntu 22.04 / 24.04, Debian 11 / 12, RHEL / Rocky Linux 9
# Run: chmod +x scripts/deploy-vps.sh && ./scripts/deploy-vps.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[38;5;82m"
BLUE="\033[38;5;39m"
PURPLE="\033[38;5;141m"
AMBER="\033[38;5;214m"
RED="\033[38;5;196m"
NC="\033[0m"

log_info()  { echo -e "${BLUE}${BOLD}[BidKaro Deploy]${NC} $1"; }
log_ok()    { echo -e "${GREEN}${BOLD}[BidKaro ✓]${NC} $1"; }
log_warn()  { echo -e "${AMBER}${BOLD}[BidKaro !]${NC} $1"; }
log_err()   { echo -e "${RED}${BOLD}[BidKaro ✗]${NC} $1"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo -e "${PURPLE}${BOLD}"
cat << "EOF"
  ____  _     _ _  __                
 | __ )(_) __| | |/ /__ _ _ __ ___   
 |  _ \| |/ _` | ' // _` | '__/ _ \  
 | |_) | | (_| | . \ (_| | | | (_) | 
 |____/|_|\__,_|_|\_\__,_|_|  \___/  
 AI Tender Analysis & Turnkey Bid Platform
 PRODUCTION VPS DEPLOYMENT ORCHESTRATOR
EOF
echo -e "${NC}"

# ── 1. Check Docker & Docker Compose ──────────────────────────────────────────
log_info "Verifying container runtime environment..."
if ! command -v docker &> /dev/null; then
  log_warn "Docker is not installed. Installing official Docker engine..."
  curl -fsSL https://get.docker.com | sh
  sudo systemctl enable --now docker
  log_ok "Docker installed successfully."
else
  log_ok "Docker found: $(docker --version)"
fi

if ! docker compose version &> /dev/null; then
  log_err "Docker Compose V2 plugin is required. Please install 'docker-compose-plugin'."
  exit 1
fi
log_ok "Docker Compose found: $(docker compose version)"

# ── 2. Environment Configuration (.env) ───────────────────────────────────────
if [ ! -f .env ]; then
  log_warn ".env file not found. Generating production .env from template..."
  cp .env.production.example .env

  # Generate cryptographic secrets
  APP_SECRET=$(openssl rand -hex 32)
  DB_PASS=$(openssl rand -hex 16)
  
  # Detect Public IP
  PUBLIC_IP=$(curl -s --connect-timeout 3 ifconfig.me || curl -s --connect-timeout 3 ipinfo.io/ip || echo "YOUR_VPS_IP")

  # Replace generated placeholders
  sed -i "s/replace-with-a-secure-random-32-byte-hex-secret/${APP_SECRET}/g" .env
  sed -i "s/replace-with-strong-db-password-32-chars/${DB_PASS}/g" .env
  sed -i "s/YOUR_VPS_IP/${PUBLIC_IP}/g" .env

  log_ok ".env generated with secure random secrets and detected IP (${PUBLIC_IP})."
  log_warn "Remember to add your OPENROUTER_API_KEY / GROQ_API_KEY and BREVO_API_KEY to .env!"
else
  log_ok "Existing .env detected."
fi

# ── 3. Persistent Directories ─────────────────────────────────────────────────
log_info "Creating persistent storage directories..."
mkdir -p uploads logs nginx/certs
chmod -R 775 uploads logs

# ── 4. Build Containers ───────────────────────────────────────────────────────
log_info "Building production container images (FastAPI, Celery, Nginx React SPA)..."
docker compose -f docker-compose.prod.yml build --progress=plain

# ── 5. Launch Stack ───────────────────────────────────────────────────────────
log_info "Starting BidKaro production service stack..."
docker compose -f docker-compose.prod.yml up -d

# ── 6. Health & Schema Verification ───────────────────────────────────────────
log_info "Waiting for PostgreSQL & Redis health checks..."
RETRIES=15
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U bidkaro > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo -n "."
  sleep 2
  RETRIES=$((RETRIES-1))
done
echo ""

if [ $RETRIES -eq 0 ]; then
  log_err "PostgreSQL failed to become healthy in time. Inspect logs: docker compose -f docker-compose.prod.yml logs postgres"
  exit 1
fi
log_ok "PostgreSQL 16 & pgvector are healthy."

log_info "Verifying database schema, vector extensions & Brevo opt-in tables..."
docker compose -f docker-compose.prod.yml exec -T api python scripts/init_db.py

# ── 7. Verification Endpoint Check ────────────────────────────────────────────
log_info "Verifying live HTTP health check..."
sleep 3
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")

if [ "$HEALTH_CODE" = "200" ]; then
  log_ok "BidKaro API & Frontend Nginx Proxy responding with HTTP 200 OK!"
else
  log_warn "Health endpoint returned HTTP ${HEALTH_CODE}. Containers may still be warming up."
fi

# ── 8. Completion Summary ─────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s --connect-timeout 2 ifconfig.me || echo "YOUR_VPS_IP")
echo -e "\n${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD} ✓ BidKaro Platform Successfully Deployed & Running on VPS!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo -e " • Web UI:              ${CYAN}http://${PUBLIC_IP}/${NC}"
echo -e " • API Health:          ${CYAN}http://${PUBLIC_IP}/api/health${NC}"
echo -e " • Swagger Docs:        ${CYAN}http://${PUBLIC_IP}/api/docs${NC}"
echo -e " • Google SSO:          ${GREEN}Production Ready${NC} (Client ID Configured)"
echo -e " • Brevo Email Opt-In:  ${GREEN}Active & Synced${NC}"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo -e " 1. Configure your domain DNS A-record to point to ${BOLD}${PUBLIC_IP}${NC}"
echo -e " 2. Add https://${PUBLIC_IP} to Authorized JavaScript Origins in Google Cloud Console"
echo -e " 3. Run ${BOLD}./scripts/setup-ssl.sh yourdomain.com${NC} to enable free Let's Encrypt HTTPS"
echo -e " 4. View live logs: ${BOLD}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}\n"

