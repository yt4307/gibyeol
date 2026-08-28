FROM php:8.4-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends git libicu-dev libzip-dev unzip \
    && docker-php-ext-install intl opcache pdo_mysql \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

COPY backend/ /var/www/html/
COPY infra/docker/backend/php.ini /usr/local/etc/php/conf.d/gibyeol.ini
COPY infra/docker/backend/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY infra/docker/backend/entrypoint.sh /usr/local/bin/gibyeol-entrypoint

ARG COMPOSER_INSTALL_FLAGS=""

RUN composer install --no-interaction --prefer-dist --no-progress --no-scripts ${COMPOSER_INSTALL_FLAGS} \
    && composer dump-autoload --no-interaction --optimize ${COMPOSER_INSTALL_FLAGS} \
    && mkdir -p var/cache var/log \
    && chown -R www-data:www-data var \
    && chmod +x /usr/local/bin/gibyeol-entrypoint

EXPOSE 80

ENTRYPOINT ["gibyeol-entrypoint"]
CMD ["apache2-foreground"]
