#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-infra}"     # infra | full | prod

case "$MODE" in
  infra)
    echo "▶ Starting infrastructure only (Postgres, pgAdmin, Redis, MailHog, mock-oauth)"
    echo "  Run backend on host with:  cd ../backend && mvn spring-boot:run"
    echo "  Run frontend on host with: cd ../frontend && npm run dev"
    docker compose --profile dev up -d
    ;;
  full)
    echo "▶ Building and starting the full stack in containers"
    docker compose --profile dev --profile full up -d --build
    ;;
  prod)
    echo "▶ Building and starting the production stack (behind nginx)"
    docker compose --profile full --profile prod up -d --build
    ;;
  *)
    echo "Usage: $0 {infra|full|prod}"
    exit 1
    ;;
esac

echo ""
docker compose ps
echo ""
echo "  Postgres  → localhost:${POSTGRES_PORT:-5432}"
echo "  pgAdmin   → http://localhost:${PGADMIN_PORT:-5050}"
echo "  Redis     → localhost:${REDIS_PORT:-6379}"
echo "  MailHog   → http://localhost:${MAILHOG_UI_PORT:-8025}"
echo "  Mock OAuth→ http://localhost:${MOCK_OAUTH_PORT:-9000}"
if [[ "$MODE" != "infra" ]]; then
  echo "  Backend   → http://localhost:${BACKEND_PORT:-8080}"
  echo "  Frontend  → http://localhost:${FRONTEND_PORT:-3000}"
fi
if [[ "$MODE" == "prod" ]]; then
  echo "  App       → http://localhost:${NGINX_HTTP_PORT:-80}  (via nginx)"
fi