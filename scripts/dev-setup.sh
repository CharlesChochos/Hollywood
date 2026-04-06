#!/usr/bin/env bash
set -euo pipefail

# AI Hollywood Studio — Dev Setup
# Prerequisites: Docker, Node.js 22+, pnpm 10+

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[error]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}── $1 ──${NC}"; }

cd "$(dirname "$0")/.."
ROOT=$(pwd)

# ── Preflight checks ──
step "Checking prerequisites"
command -v docker >/dev/null 2>&1 || err "Docker is required. Install from https://docs.docker.com/get-docker/"
command -v node >/dev/null 2>&1   || err "Node.js is required. Install v22+ from https://nodejs.org"
command -v pnpm >/dev/null 2>&1   || err "pnpm is required. Run: npm install -g pnpm@latest"

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 22 ]; then
  err "Node.js 22+ required, found $(node -v)"
fi
log "Node.js $(node -v), pnpm $(pnpm --version), Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

# ── Environment ──
step "Environment configuration"
if [ ! -f .env ]; then
  log "Creating .env from .env.example..."
  cp .env.example .env
  log ".env created — edit API keys if you want real AI providers"
else
  log ".env already exists"
fi

# ── Dependencies ──
step "Installing dependencies"
pnpm install

# ── Docker services ──
step "Starting infrastructure services"
docker compose up -d postgres redis minio

wait_for_service() {
  local name=$1
  local cmd=$2
  local max_wait=30
  local elapsed=0
  while [ $elapsed -lt $max_wait ]; do
    if eval "$cmd" >/dev/null 2>&1; then
      log "$name is healthy"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  warn "$name did not become healthy within ${max_wait}s (continuing anyway)"
}

wait_for_service "PostgreSQL" "docker compose exec -T postgres pg_isready -U hollywood"
wait_for_service "Redis" "docker compose exec -T redis redis-cli ping"
wait_for_service "MinIO" "curl -sf http://localhost:9000/minio/health/live"

# ── Database ──
step "Database setup"
log "Running migrations..."
pnpm db:migrate

log "Seeding demo data..."
pnpm db:seed 2>/dev/null && log "Seed complete" || warn "Seed skipped (may already exist)"

# ── MinIO bucket ──
step "Object storage setup"
docker compose exec -T minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
docker compose exec -T minio mc mb local/hollywood-assets --ignore-existing 2>/dev/null && log "Bucket 'hollywood-assets' ready" || warn "Bucket creation skipped"

# ── Verification ──
step "Verifying build"
pnpm type-check && log "All packages type-check clean" || warn "Type-check had issues"

# ── Done ──
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  AI Hollywood Studio is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Start development servers:"
echo "    pnpm dev           # Next.js on http://localhost:3000"
echo ""
echo "  Other services:"
echo "    MinIO Console:     http://localhost:9001 (minioadmin/minioadmin)"
echo "    Drizzle Studio:    pnpm db:studio"
echo ""
echo "  Login with: demo@hollywood.ai"
echo ""
