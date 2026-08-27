#!/bin/sh

set -eu

COMPOSE_FILE_PATH="${COMPOSE_FILE_PATH:-docker-compose.dev.yml}"

pnpm lint:frontend
pnpm typecheck
pnpm test
pnpm build:frontend
pnpm build:storybook

docker compose -f "$COMPOSE_FILE_PATH" config --quiet
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps backend \
  composer install --no-interaction --prefer-dist --no-progress
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps backend composer validate --strict
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  -e APP_ENV=test -e APP_DEBUG=0 backend composer test
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps contracts fmt --check
docker compose -f "$COMPOSE_FILE_PATH" run --rm --no-deps contracts test
