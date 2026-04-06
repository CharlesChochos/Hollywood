#!/usr/bin/env bash
set -euo pipefail

# AI Hollywood Studio — Smoke Test
# Verifies the full stack is working after dev-setup.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $name"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $name"
    ((FAIL++))
  fi
}

cd "$(dirname "$0")/.."

echo "AI Hollywood Studio — Smoke Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Infrastructure ──
echo "Infrastructure:"
check "PostgreSQL is running" docker compose exec -T postgres pg_isready -U hollywood
check "Redis is running" docker compose exec -T redis redis-cli ping
check "MinIO is running" curl -sf http://localhost:9000/minio/health/live

echo ""

# ── Build ──
echo "Build:"
check "Type check passes" pnpm type-check
check "Production build passes" pnpm build

echo ""

# ── Database ──
echo "Database:"
check "Migrations applied" pnpm db:migrate
check "Seed data exists" docker compose exec -T postgres psql -U hollywood -d hollywood -c "SELECT count(*) FROM projects" -t

echo ""

# ── Web App ──
echo "Web App:"
# Start Next.js in background, wait, then check
pnpm --filter @hollywood/web dev &
WEB_PID=$!
sleep 5

check "Next.js responds on :3000" curl -sf http://localhost:3000
check "Auth endpoint exists" curl -sf http://localhost:3000/api/auth/providers
check "tRPC endpoint exists" curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/api/trpc/project.list

kill $WEB_PID 2>/dev/null || true
wait $WEB_PID 2>/dev/null || true

echo ""

# ── Summary ──
TOTAL=$((PASS + FAIL))
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}All $TOTAL checks passed!${NC}"
else
  echo -e "${RED}$FAIL/$TOTAL checks failed${NC}"
  exit 1
fi
