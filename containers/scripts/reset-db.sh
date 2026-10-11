#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "⚠️  This will DESTROY all data in the MySQL volume."
read -p "Continue? (y/N) " -n 1 -r; echo
[[ $REPLY =~ ^[Yy]$ ]] || exit 1
docker compose stop mysql
docker compose rm -f mysql
docker volume rm apartment-saas_mysql_data 2>/dev/null || true
docker compose --profile dev up -d mysql
