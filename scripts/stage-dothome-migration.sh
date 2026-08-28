#!/bin/sh

set -eu

REPOSITORY_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
STAGING_HTML="${DOTHOME_STAGING_ROOT:-${REPOSITORY_ROOT}/.deploy/dothome}/html"
RUNNER_SOURCE="${REPOSITORY_ROOT}/infra/dothome/gibyeol-migrate.php"
RUNNER_TARGET="${STAGING_HTML}/gibyeol-migrate.php"
TOKEN_TARGET="${STAGING_HTML}/_gibyeol/var/migration-token"

case "${STAGING_HTML}" in
    "${REPOSITORY_ROOT}/.deploy/"*) ;;
    *)
        echo "Refusing to stage migration files outside ${REPOSITORY_ROOT}/.deploy" >&2
        exit 1
        ;;
esac

if [ ! -f "${STAGING_HTML}/_gibyeol/vendor/autoload.php" ]; then
    echo "Dothome artifact is missing: ${STAGING_HTML}" >&2
    exit 1
fi

if [ -e "${RUNNER_TARGET}" ] || [ -e "${TOKEN_TARGET}" ]; then
    echo "Migration staging files already exist; remove them only after checking their deployment state." >&2
    exit 1
fi

cp "${RUNNER_SOURCE}" "${RUNNER_TARGET}"
chmod 644 "${RUNNER_TARGET}"
umask 077
openssl rand -hex 32 > "${TOKEN_TARGET}"

echo "Migration runner staged: ${RUNNER_TARGET}"
echo "One-time token staged: ${TOKEN_TARGET}"
echo "Upload both files, submit the token over the form, then delete the runner and lock file."
