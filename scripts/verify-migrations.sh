#!/bin/sh

set -eu

COMPOSE_FILE_PATH="${COMPOSE_FILE_PATH:-docker-compose.dev.yml}"
MIGRATION_PROJECT="gibyeol-migrations-$$"

cleanup() {
  docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" down --volumes --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# A unique Compose project guarantees that every run starts with a new MySQL volume.
MYSQL_PORT=0 DEV_MYSQL_PORT=0 docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" up -d --wait db
MYSQL_PORT=0 DEV_MYSQL_PORT=0 docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  -e APP_ENV=test -e APP_DEBUG=0 \
  backend php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
MYSQL_PORT=0 DEV_MYSQL_PORT=0 docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  -e APP_ENV=test -e APP_DEBUG=0 \
  backend php bin/console doctrine:migrations:up-to-date
