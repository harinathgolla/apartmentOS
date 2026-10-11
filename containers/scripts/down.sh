#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Bring down the full stack: frontend + backend containers included.
# Includes the `dev` and `full` profiles so backend/frontend are stopped too.
docker compose --profile dev --profile full down

# Optional: also tear down the prod profile (nginx) if it was up.
# Uncomment the line below to always include it:
# docker compose --profile dev --profile full --profile prod down
