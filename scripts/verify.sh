#!/bin/sh

set -eu

COMPOSE_FILE_PATH="${COMPOSE_FILE_PATH:-docker-compose.dev.yml}"
CONTRACT_RUN_USER="${CONTRACT_RUN_USER:-$(id -u):$(id -g)}"

pnpm lint:frontend
pnpm typecheck
pnpm test
pnpm build:frontend
pnpm build:storybook
node scripts/validate-deployment-manifest.mjs docs/deployment-manifest.example.json

docker compose -f "$COMPOSE_FILE_PATH" config --quiet
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps backend \
  composer install --no-interaction --prefer-dist --no-progress
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps backend composer validate --strict
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  -e APP_ENV=test -e APP_DEBUG=0 -e WEB_ORIGIN=https://yt4307.github.io \
  backend php bin/console cache:clear --env=test
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  -e APP_ENV=test -e APP_DEBUG=0 -e WEB_ORIGIN=https://yt4307.github.io \
  backend composer test
COMPOSE_FILE_PATH="$COMPOSE_FILE_PATH" ./scripts/verify-migrations.sh
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  --user "$CONTRACT_RUN_USER" -e HOME=/tmp contracts fmt --check
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  --user "$CONTRACT_RUN_USER" -e HOME=/tmp contracts test
