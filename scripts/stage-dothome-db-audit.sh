#!/bin/sh

set -eu

REPOSITORY_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
STAGING_HTML="${DOTHOME_STAGING_ROOT:-${REPOSITORY_ROOT}/.deploy/dothome}/html"
RUNNER_SOURCE="${REPOSITORY_ROOT}/infra/dothome/gibyeol-db-audit.php"
RUNNER_TARGET="${STAGING_HTML}/gibyeol-db-audit.php"
TOKEN_TARGET="${REPOSITORY_ROOT}/.deploy/dothome-db-audit-token"

case "${STAGING_HTML}" in
    "${REPOSITORY_ROOT}/.deploy/"*) ;;
    *)
        echo "Refusing to stage database audit files outside ${REPOSITORY_ROOT}/.deploy" >&2
        exit 1
        ;;
esac

if [ ! -f "${STAGING_HTML}/_gibyeol/vendor/autoload.php" ]; then
    echo "Dothome artifact is missing: ${STAGING_HTML}" >&2
    exit 1
fi

if [ -e "${RUNNER_TARGET}" ] || [ -e "${TOKEN_TARGET}" ]; then
    echo "Database audit staging files already exist; remove them only after checking their deployment state." >&2
    exit 1
fi

umask 077
TOKEN=$(openssl rand -hex 32)
TOKEN_HASH=$(printf '%s' "${TOKEN}" | openssl dgst -sha256 -r | awk '{print $1}')
printf '%s\n' "${TOKEN}" > "${TOKEN_TARGET}"
sed "s/__DB_AUDIT_TOKEN_HASH__/${TOKEN_HASH}/" "${RUNNER_SOURCE}" > "${RUNNER_TARGET}"
chmod 644 "${RUNNER_TARGET}"

echo "Database audit runner staged: ${RUNNER_TARGET}"
echo "Local one-time token created outside the FTP context: ${TOKEN_TARGET}"
echo "Upload only the runner, submit the token over HTTPS, then confirm that the runner deleted itself."
