<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

echo json_encode(
    [
        'ok' => true,
        'service' => 'gibyeol-dothome-smoke',
        'phpVersion' => PHP_VERSION,
    ],
    JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES,
);
