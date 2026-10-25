#!/bin/bash
set -euo pipefail

# Usage: ./start.sh [IMAGE_TAG]
#   IMAGE_TAG defaults to "latest" but CI passes the git sha so the deploy is
#   immutable and verifiable. Exported so docker-compose.yml can interpolate it.
cd /opt/apartmentos

export IMAGE_TAG="${1:-latest}"
echo "=== Deploying IMAGE_TAG=${IMAGE_TAG} ==="

# ── DB password + JWT secret from SSM (instance role) ────────────────────────
DB_PASSWORD=$(aws ssm get-parameter --name /apartmentos/dev/db/password --with-decryption \
  --region ap-south-2 --query Parameter.Value --output text)

JWT_SECRET=$(aws ssm get-parameter --name /apartmentos/dev/jwt/secret --with-decryption \
  --region ap-south-2 --query Parameter.Value --output text 2>/dev/null || echo "change-me-32-byte-dev-secret-xxxxxxxx")

cat > .env <<EOF
SPRING_PROFILES_ACTIVE=docker
SPRING_DATASOURCE_URL=jdbc:mysql://apartmentos-mysql.cfm28044y72p.ap-south-2.rds.amazonaws.com:3306/apartment_db?useSSL=true&requireSSL=true&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=apartment
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
APP_MAIL_PROVIDER=gmail-api
APP_FRONTEND_URL=http://18.60.42.236
JWT_SECRET=${JWT_SECRET}
EOF
chmod 600 .env

# ── Pull the requested image tag (fails loudly if missing) ───────────────────
echo '--- pulling images ---'
docker compose pull

echo '--- recreating ---'
docker compose up -d --force-recreate --remove-orphans

# ── Health gate: fail the deploy if the stack does not come up ───────────────
echo '--- waiting for backend health ---'
for i in $(seq 1 40); do
  if curl -fsS -m 5 http://localhost/api/actuator/health >/dev/null 2>&1; then
    echo 'backend healthy'
    break
  fi
  if [ "$i" -eq 40 ]; then
    echo 'ERROR: backend did not become healthy' >&2
    docker compose ps >&2
    docker compose logs backend --tail 60 >&2 || true
    exit 1
  fi
  sleep 5
done

echo '--- waiting for frontend via nginx ---'
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 http://localhost/ || true)
  if [ "$code" = "200" ]; then
    echo 'frontend 200 via nginx'
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "ERROR: frontend not 200 (last=${code})" >&2
    docker compose logs frontend --tail 40 >&2 || true
    docker compose logs nginx --tail 40 >&2 || true
    exit 1
  fi
  sleep 5
done

echo '--- deployed ---'
docker compose ps
echo "DEPLOY_OK IMAGE_TAG=${IMAGE_TAG}"
