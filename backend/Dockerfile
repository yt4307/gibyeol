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

RUN composer install --no-interaction --prefer-dist --no-progress --no-scripts \
    && composer dump-autoload --no-interaction --optimize \
    && mkdir -p var/cache var/log \
    && chown -R www-data:www-data var

EXPOSE 80
