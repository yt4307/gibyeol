#!/bin/sh

set -eu

mkdir -p /var/www/html/var/cache /var/www/html/var/log /var/lib/gibyeol/packages
chown -R www-data:www-data /var/www/html/var /var/lib/gibyeol/packages

exec docker-php-entrypoint "$@"
