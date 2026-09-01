#!/bin/sh

set -eu

COMPOSE_FILE_PATH="${COMPOSE_FILE_PATH:-compose.yml}"
MIGRATION_PROJECT="gibyeol-migrations-$$"

cleanup() {
  docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" down --volumes --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

wait_for_backend_database() {
  max_attempts="${MIGRATION_DB_READY_ATTEMPTS:-10}"
  retry_delay="${MIGRATION_DB_READY_DELAY_SECONDS:-2}"
  attempt=1

  while ! MYSQL_PORT=0 DEV_MYSQL_PORT=0 docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
    -e APP_ENV=test -e APP_DEBUG=0 \
    backend php bin/console doctrine:migrations:status --no-interaction >/dev/null 2>&1; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Migration database did not become reachable after $max_attempts attempts." >&2
      return 1
    fi

    echo "Migration database is not reachable yet; retrying in ${retry_delay}s ($attempt/$max_attempts)." >&2
    attempt=$((attempt + 1))
    sleep "$retry_delay"
  done
}

# A unique Compose project guarantees that every run starts with a new MySQL volume.
MYSQL_PORT=0 DEV_MYSQL_PORT=0 docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" up -d --wait db
wait_for_backend_database
MYSQL_PORT=0 DEV_MYSQL_PORT=0 docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  -e APP_ENV=test -e APP_DEBUG=0 \
  backend php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
MYSQL_PORT=0 DEV_MYSQL_PORT=0 docker compose -p "$MIGRATION_PROJECT" -f "$COMPOSE_FILE_PATH" run --rm --no-deps \
  -e APP_ENV=test -e APP_DEBUG=0 \
  backend php bin/console doctrine:migrations:up-to-date
