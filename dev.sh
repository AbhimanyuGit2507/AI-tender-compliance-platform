#!/usr/bin/env bash
# ==============================================================================
# BidKaro — Local Development Orchestrator & Live Log Streaming
# Starts:
#   1. PostgreSQL 16 (pgvector) & Redis 7 (reuses existing or starts in Docker)
#   2. Database Schema Migrations & Demo Seeding
#   3. FastAPI Backend Server (Uvicorn with Hot Reload on :8000)
#   4. Celery Worker (Fast + Heavy queues for AI Ingestion & Doc Generation)
#   5. Vite Frontend Dev Server (React SPA with HMR on :5173)
# Logs:
#   Stores persistent logs in ./logs/ (backend.log, worker.log, frontend.log, combined.log)
# ==============================================================================

set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
LOGS_DIR="${ROOT_DIR}/logs"
VENV_PYTHON="${BACKEND_DIR}/.venv/bin/python3"
VENV_UVICORN="${BACKEND_DIR}/.venv/bin/uvicorn"
VENV_CELERY="${BACKEND_DIR}/.venv/bin/celery"

# Log files
mkdir -p "${LOGS_DIR}"
BACKEND_LOG="${LOGS_DIR}/backend.log"
WORKER_LOG="${LOGS_DIR}/worker.log"
FRONTEND_LOG="${LOGS_DIR}/frontend.log"
COMBINED_LOG="${LOGS_DIR}/combined.log"

# Colors for terminal output
BOLD="\033[1m"
GREEN="\033[38;5;82m"
BLUE="\033[38;5;39m"
PURPLE="\033[38;5;141m"
AMBER="\033[38;5;214m"
RED="\033[38;5;196m"
GRAY="\033[38;5;245m"
CYAN="\033[38;5;51m"
NC="\033[0m"

log_info()  { echo -e "${BLUE}${BOLD}[BidKaro]${NC} $1"; }
log_ok()    { echo -e "${GREEN}${BOLD}[BidKaro ✓]${NC} $1"; }
log_warn()  { echo -e "${AMBER}${BOLD}[BidKaro !]${NC} $1"; }
log_err()   { echo -e "${RED}${BOLD}[BidKaro ✗]${NC} $1"; }

print_banner() {
  echo -e "${PURPLE}${BOLD}"
  cat << "EOF"
  ____  _     _ _  __                
 | __ )(_) __| | |/ /__ _ _ __ ___   
 |  _ \| |/ _` | ' // _` | '__/ _ \  
 | |_) | | (_| | . \ (_| | | | (_) | 
 |____/|_|\__,_|_|\_\__,_|_|  \___/  
 AI Tender Analysis & Bid Preparation
EOF
  echo -e "${NC}"
}

# ------------------------------------------------------------------------------
# Port Inspection Helper (Uses Python socket without external binary dependencies)
# ------------------------------------------------------------------------------
is_port_in_use() {
  local port=$1
  "${VENV_PYTHON}" -c "import socket; s = socket.socket(); s.settimeout(0.8); exit(0 if s.connect_ex(('127.0.0.1', $port)) == 0 else 1)" 2>/dev/null
}

# ------------------------------------------------------------------------------
# Process tracking & Cleanup
# ------------------------------------------------------------------------------
PIDS=()

cleanup() {
  if [ ${#PIDS[@]} -gt 0 ]; then
    echo ""
    log_warn "Shutting down local development processes..."
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill -TERM "$pid" 2>/dev/null || true
      fi
    done
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "celery -A app.workers.celery_app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    wait 2>/dev/null || true
    log_ok "All development servers stopped safely."
    log_info "Session logs saved in: ${LOGS_DIR}/"
  fi
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# Sub-command: STOP
# ------------------------------------------------------------------------------
stop_services() {
  log_info "Stopping all BidKaro development processes..."
  pkill -f "uvicorn app.main:app" 2>/dev/null || true
  pkill -f "celery -A app.workers.celery_app" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  if command -v docker &>/dev/null; then
    docker compose stop postgres redis 2>/dev/null || true
  fi
  log_ok "All development processes stopped."
  exit 0
}

# ------------------------------------------------------------------------------
# Sub-command: STATUS
# ------------------------------------------------------------------------------
check_status() {
  log_info "Checking BidKaro Services Status..."
  echo -e "--------------------------------------------------------"
  
  # Check PostgreSQL
  if is_port_in_use 5432; then
    echo -e "PostgreSQL 16 (pgvector):   ${GREEN}ONLINE${NC} (localhost:5432)"
  else
    echo -e "PostgreSQL 16 (pgvector):   ${RED}OFFLINE${NC} (localhost:5432)"
  fi

  # Check Redis
  if is_port_in_use 6379; then
    echo -e "Redis 7 (SSE Pub/Sub):       ${GREEN}ONLINE${NC} (localhost:6379)"
  else
    echo -e "Redis 7 (SSE Pub/Sub):       ${RED}OFFLINE${NC} (localhost:6379)"
  fi

  # Check FastAPI
  if is_port_in_use 8000 && curl -sf http://localhost:8000/api/health &>/dev/null; then
    echo -e "FastAPI Backend:            ${GREEN}ONLINE${NC} (http://localhost:8000)"
  else
    echo -e "FastAPI Backend:            ${RED}OFFLINE${NC} (http://localhost:8000)"
  fi

  # Check Frontend
  if is_port_in_use 5173; then
    echo -e "Vite Frontend:              ${GREEN}ONLINE${NC} (http://localhost:5173)"
  else
    echo -e "Vite Frontend:              ${RED}OFFLINE${NC} (http://localhost:5173)"
  fi
  echo -e "--------------------------------------------------------"
  echo -e "Log Files Location:         ${CYAN}${LOGS_DIR}/${NC}"
  ls -lh "${LOGS_DIR}" 2>/dev/null || true
  echo -e "--------------------------------------------------------"
  exit 0
}

# ------------------------------------------------------------------------------
# Sub-command: LOGS
# ------------------------------------------------------------------------------
show_logs() {
  local target="${2:-all}"
  case "$target" in
    backend|api)
      log_info "Tailing backend logs (${BACKEND_LOG})..."
      tail -n 50 -f "${BACKEND_LOG}"
      ;;
    worker|celery)
      log_info "Tailing celery worker logs (${WORKER_LOG})..."
      tail -n 50 -f "${WORKER_LOG}"
      ;;
    frontend|ui)
      log_info "Tailing frontend logs (${FRONTEND_LOG})..."
      tail -n 50 -f "${FRONTEND_LOG}"
      ;;
    *)
      log_info "Tailing all logs (${LOGS_DIR}/)..."
      tail -n 25 -f "${BACKEND_LOG}" "${WORKER_LOG}" "${FRONTEND_LOG}"
      ;;
  esac
  exit 0
}

# ------------------------------------------------------------------------------
# Sub-command: CLEAN-LOGS
# ------------------------------------------------------------------------------
clean_logs() {
  log_info "Clearing log files in ${LOGS_DIR}..."
  > "${BACKEND_LOG}" 2>/dev/null || true
  > "${WORKER_LOG}" 2>/dev/null || true
  > "${FRONTEND_LOG}" 2>/dev/null || true
  > "${COMBINED_LOG}" 2>/dev/null || true
  log_ok "Log files reset successfully."
  exit 0
}

# ------------------------------------------------------------------------------
# Sub-command: SEED
# ------------------------------------------------------------------------------
run_seed() {
  log_info "Seeding demo company facts, MJP tender, requirements & BOQ..."
  PYTHONPATH="${BACKEND_DIR}" "${VENV_PYTHON}" "${BACKEND_DIR}/scripts/seed_demo.py"
  log_ok "Database successfully seeded."
  exit 0
}

# ------------------------------------------------------------------------------
# Argument Routing
# ------------------------------------------------------------------------------
case "${1:-}" in
  stop|down|--stop)
    stop_services
    ;;
  status|--status)
    check_status
    ;;
  logs|--logs)
    show_logs "$@"
    ;;
  clean-logs|--clean-logs)
    clean_logs
    ;;
  seed|--seed)
    run_seed
    ;;
  docker|--docker)
    print_banner
    log_info "Starting full stack in Docker Compose..."
    exec docker compose up --build
    ;;
  help|-h|--help)
    echo "Usage: ./dev.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  (none)        Start local dev stack (smart port reuse + live log files)"
    echo "  logs [svc]    Tail logs: ./dev.sh logs [backend|worker|frontend|all]"
    echo "  clean-logs    Clear all stored log files"
    echo "  status        Check health of all ports, services, and log sizes"
    echo "  stop          Stop all local servers and Docker dependencies"
    echo "  seed          Populate demo tenant, MJP tender, and company vault facts"
    echo "  docker        Run the entire application stack in Docker Compose"
    exit 0
    ;;
esac

# ------------------------------------------------------------------------------
# 1. Verification of Prerequisites
# ------------------------------------------------------------------------------
print_banner

log_info "Verifying environment prerequisites..."

if [ ! -f "${VENV_PYTHON}" ]; then
  log_err "Python virtual environment not found at: ${VENV_PYTHON}"
  log_info "Creating virtual environment and installing backend dependencies..."
  python3 -m venv "${BACKEND_DIR}/.venv"
  "${BACKEND_DIR}/.venv/bin/pip" install -r "${BACKEND_DIR}/requirements.txt"
fi

if [ ! -d "${ROOT_DIR}/node_modules" ]; then
  log_info "node_modules not found. Running npm install..."
  npm install
fi

# ------------------------------------------------------------------------------
# 2. Backing Services: PostgreSQL (pgvector) & Redis 7
# ------------------------------------------------------------------------------
log_info "Checking PostgreSQL (port 5432) and Redis (port 6379)..."

# 2a. PostgreSQL
if is_port_in_use 5432; then
  log_ok "PostgreSQL is already active on localhost:5432. Reusing active instance."
else
  log_info "Starting PostgreSQL 16 (pgvector) container in Docker..."
  if command -v docker &>/dev/null; then
    docker compose up -d postgres || {
      log_err "Failed to start postgres container. Please verify Docker or free port 5432."
      exit 1
    }
  else
    log_err "PostgreSQL is not running on port 5432 and Docker is not available."
    exit 1
  fi
fi

# 2b. Redis
if is_port_in_use 6379; then
  log_ok "Redis 7 is already active on localhost:6379. Reusing active instance."
else
  log_info "Starting Redis 7 container in Docker..."
  if command -v docker &>/dev/null; then
    docker compose up -d redis || {
      log_err "Failed to start redis container. Please verify Docker or free port 6379."
      exit 1
    }
  else
    log_err "Redis is not running on port 6379 and Docker is not available."
    exit 1
  fi
fi

# ------------------------------------------------------------------------------
# 3. Database Initialization & Schema Setup
# ------------------------------------------------------------------------------
log_info "Verifying database tables and pgvector extension..."
PYTHONPATH="${BACKEND_DIR}" "${VENV_PYTHON}" "${BACKEND_DIR}/scripts/init_db.py" > /dev/null 2>&1 || true

# Note: To seed optional demo data manually, run: ./dev.sh seed

# ------------------------------------------------------------------------------
# 4. Initialize Session Logs
# ------------------------------------------------------------------------------
SESSION_HEADER="=== BidKaro Session: $(date '+%Y-%m-%d %H:%M:%S') ==="
echo "${SESSION_HEADER}" >> "${BACKEND_LOG}"
echo "${SESSION_HEADER}" >> "${WORKER_LOG}"
echo "${SESSION_HEADER}" >> "${FRONTEND_LOG}"
echo "${SESSION_HEADER}" >> "${COMBINED_LOG}"
log_ok "Logging initialized -> ${LOGS_DIR}/"

# ------------------------------------------------------------------------------
# 5. Launch FastAPI Backend Server (Hot-Reload)
# ------------------------------------------------------------------------------
log_info "Starting FastAPI Backend on http://localhost:8000..."
(
  cd "${BACKEND_DIR}"
  PYTHONPATH="${BACKEND_DIR}" "${VENV_PYTHON}" -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    2>&1 | tee -a "${BACKEND_LOG}" "${COMBINED_LOG}" | sed -u "s/^/$(echo -e "${BLUE}[backend]${NC} ")/"
) &
PIDS+=($!)

# ------------------------------------------------------------------------------
# 6. Launch Celery Worker (Background Ingestion & Compilation)
# ------------------------------------------------------------------------------
log_info "Starting Celery Background Worker..."
(
  cd "${BACKEND_DIR}"
  PYTHONPATH="${BACKEND_DIR}" "${VENV_PYTHON}" -m celery -A app.workers.celery_app worker \
    -Q fast,heavy \
    --concurrency=2 \
    --loglevel=INFO \
    2>&1 | tee -a "${WORKER_LOG}" "${COMBINED_LOG}" | sed -u "s/^/$(echo -e "${PURPLE}[worker] ${NC} ")/"
) &
PIDS+=($!)

# ------------------------------------------------------------------------------
# 7. Launch Vite Frontend Dev Server (Hot Module Replacement)
# ------------------------------------------------------------------------------
log_info "Starting Vite Frontend on http://localhost:5173..."
(
  cd "${ROOT_DIR}"
  npm run dev -- --host 0.0.0.0 2>&1 | tee -a "${FRONTEND_LOG}" "${COMBINED_LOG}" | sed -u "s/^/$(echo -e "${GREEN}[frontend]${NC} ")/"
) &
PIDS+=($!)

# Wait briefly for servers to bind ports
sleep 3

# ------------------------------------------------------------------------------
# 8. Print Active Development Dashboard
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}========================================================================${NC}"
echo -e "${GREEN}${BOLD}            BidKaro Local Development Environment is LIVE              ${NC}"
echo -e "${GREEN}${BOLD}========================================================================${NC}"
echo -e "  🌐  ${BOLD}Frontend Application:${NC}    ${GREEN}http://localhost:5173${NC}"
echo -e "  🔌  ${BOLD}FastAPI Backend API:${NC}     ${BLUE}http://localhost:8000${NC}"
echo -e "  📖  ${BOLD}Interactive Swagger Docs:${NC} ${BLUE}http://localhost:8000/api/docs${NC}"
echo -e "  🔍  ${BOLD}Tender Discovery Feed:${NC}   ${GREEN}http://localhost:5173/discovery${NC}"
echo -e "  🛡️   ${BOLD}Company Vault & Evidence:${NC} ${GREEN}http://localhost:5173/vault${NC}"
echo -e "  📝  ${BOLD}Persistent Log Files:${NC}    ${CYAN}${LOGS_DIR}/{backend,worker,frontend}.log${NC}"
echo -e "  🔒  ${BOLD}Auth Engine:${NC}              Active JWT Authentication & Protected Workspaces"
echo -e "${GRAY}------------------------------------------------------------------------${NC}"
echo -e "  View logs anytime in another terminal: ${BOLD}./dev.sh logs [backend|worker|frontend]${NC}"
echo -e "  Press ${AMBER}${BOLD}Ctrl + C${NC} to stop all servers and release ports."
echo -e "${GREEN}${BOLD}========================================================================${NC}"
echo ""

# Wait for all background processes
wait
