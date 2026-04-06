#!/usr/bin/env bash
set -euo pipefail

# AI Hollywood Studio — Dev Setup
# Prerequisites: Docker, Node.js 22+, pnpm 10+

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[error]${NC} $1"; exit 1; }

cd "$(dirname "$0")/.."
ROOT=$(pwd)

# ── Preflight checks ──
command -v docker >/dev/null 2>&1 || err "Docker is required. Install from https://docs.docker.com/get-docker/"
command -v node >/dev/null 2>&1   || err "Node.js is required. Install v22+ from https://nodejs.org"
command -v pnpm >/dev/null 2>&1   || err "pnpm is required. Run: npm install -g pnpm@latest"

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 22 ]; then
  err "Node.js 22+ required, found $(node -v)"
fi

# ── Environment ──
if [ ! -f .env ]; then
  log "Creating .env from .env.example..."
  cp .env.example .env
  log ".env created — edit API keys if you want real AI providers"
else
  log ".env already exists"
fi

# ── Dependencies ──
log "Installing dependencies..."
pnpm install

# ── Docker services ──
log "Starting PostgreSQL, Redis, MinIO..."
docker compose up -d

log "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U hollywood >/dev/null 2>&1; do
  sleep 1
done
log "PostgreSQL is ready"

log "Waiting for Redis..."
until docker compose exec -T redis redis-cli ping >/dev/null 2>&1; do
  sleep 1
done
log "Redis is ready"

# ── Database ──
log "Running database migrations..."
pnpm db:migrate

log "Seeding database..."
pnpm db:seed

# ── MinIO bucket ──
log "Creating S3 bucket..."
docker compose exec -T minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
docker compose exec -T minio mc mb local/hollywood-assets --ignore-existing 2>/dev/null || true

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
