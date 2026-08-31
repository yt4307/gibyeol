#!/bin/sh

set -eu

REPOSITORY_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
STAGING_ROOT="${DOTHOME_STAGING_ROOT:-${REPOSITORY_ROOT}/.deploy/dothome}"
STAGING_HTML="${STAGING_ROOT}/html"
IMAGE_NAME="gibyeol-backend:dothome-artifact"

case "${STAGING_HTML}" in
    "${REPOSITORY_ROOT}/.deploy/"*) ;;
    *)
        echo "Refusing to replace staging outside ${REPOSITORY_ROOT}/.deploy" >&2
        exit 1
        ;;
esac

if [ -d "${STAGING_HTML}" ] && [ -n "$(find "${STAGING_HTML}" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
    if [ "${1:-}" != "--force" ]; then
        echo "Staging is not empty: ${STAGING_HTML}" >&2
        echo "Re-run with --force only after reviewing its generated contents." >&2
        exit 1
    fi
fi

BUILD_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/gibyeol-dothome.XXXXXX")
CONTAINER_ID=""
cleanup() {
    if [ -n "${CONTAINER_ID}" ]; then
        docker rm -f "${CONTAINER_ID}" >/dev/null 2>&1 || true
    fi
    rm -rf -- "${BUILD_ROOT}"
}
trap cleanup EXIT HUP INT TERM

docker build \
    --build-arg COMPOSER_INSTALL_FLAGS=--no-dev \
    --file "${REPOSITORY_ROOT}/backend/Dockerfile" \
    --tag "${IMAGE_NAME}" \
    "${REPOSITORY_ROOT}"

mkdir -p "${BUILD_ROOT}/html/_gibyeol"
CONTAINER_ID=$(docker create "${IMAGE_NAME}")
docker cp "${CONTAINER_ID}:/var/www/html/." "${BUILD_ROOT}/html/_gibyeol"
docker rm "${CONTAINER_ID}" >/dev/null
CONTAINER_ID=""

rm -rf -- \
    "${BUILD_ROOT}/html/_gibyeol/.phpunit.cache" \
    "${BUILD_ROOT}/html/_gibyeol/public" \
    "${BUILD_ROOT}/html/_gibyeol/tests" \
    "${BUILD_ROOT}/html/_gibyeol/var"
rm -f -- \
    "${BUILD_ROOT}/html/_gibyeol/.editorconfig" \
    "${BUILD_ROOT}/html/_gibyeol/.env" \
    "${BUILD_ROOT}/html/_gibyeol/.env.test" \
    "${BUILD_ROOT}/html/_gibyeol/.gitignore" \
    "${BUILD_ROOT}/html/_gibyeol/Dockerfile" \
    "${BUILD_ROOT}/html/_gibyeol/bin/phpunit" \
    "${BUILD_ROOT}/html/_gibyeol/config/reference.php" \
    "${BUILD_ROOT}/html/_gibyeol/migrations/.gitignore" \
    "${BUILD_ROOT}/html/_gibyeol/migrations/.gitkeep" \
    "${BUILD_ROOT}/html/_gibyeol/phpunit.xml.dist"

mkdir -p \
    "${BUILD_ROOT}/html/_gibyeol/var/cache" \
    "${BUILD_ROOT}/html/_gibyeol/var/log"
cp "${REPOSITORY_ROOT}/infra/dothome/root.htaccess" "${BUILD_ROOT}/html/.htaccess"
cp "${REPOSITORY_ROOT}/infra/dothome/private.htaccess" "${BUILD_ROOT}/html/_gibyeol/.htaccess"
cp "${REPOSITORY_ROOT}/infra/dothome/public-index.php" "${BUILD_ROOT}/html/index.php"
cp "${REPOSITORY_ROOT}/infra/dothome/app.env" "${BUILD_ROOT}/html/_gibyeol/.env"
cp "${REPOSITORY_ROOT}/infra/dothome/env.local.example" "${BUILD_ROOT}/html/_gibyeol/.env.local.example"

ENV_LOCAL_PRESERVED=false
if [ -f "${STAGING_HTML}/_gibyeol/.env.local" ]; then
    cp -p \
        "${STAGING_HTML}/_gibyeol/.env.local" \
        "${BUILD_ROOT}/html/_gibyeol/.env.local"
    ENV_LOCAL_PRESERVED=true
fi

rm -rf -- "${STAGING_HTML}"
mkdir -p "${STAGING_ROOT}"
mv "${BUILD_ROOT}/html" "${STAGING_HTML}"

echo "Dothome artifact ready: ${STAGING_HTML}"
if [ "${ENV_LOCAL_PRESERVED}" = true ]; then
    echo "Preserved existing ${STAGING_HTML}/_gibyeol/.env.local."
else
    echo "Create ${STAGING_HTML}/_gibyeol/.env.local before upload."
fi
