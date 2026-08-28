<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

$requiredExtensions = [
    'ctype',
    'iconv',
    'mbstring',
    'openssl',
    'pdo',
    'pdo_mysql',
    'sodium',
];

$extensions = [];
foreach ([...$requiredExtensions, 'curl'] as $extension) {
    $extensions[$extension] = extension_loaded($extension);
}

$phpVersionSupported = version_compare(PHP_VERSION, '8.4.0', '>=')
    && version_compare(PHP_VERSION, '8.5.0', '<');
$allowUrlFopen = filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOL);
$outboundHttpSupported = $allowUrlFopen || $extensions['curl'];
$temporaryDirectoryWritable = is_writable(sys_get_temp_dir());
$ready = $phpVersionSupported
    && !in_array(false, array_intersect_key($extensions, array_flip($requiredExtensions)), true)
    && $outboundHttpSupported
    && $temporaryDirectoryWritable;

echo json_encode([
    'ready' => $ready,
    'php' => [
        'version' => PHP_VERSION,
        'supported' => $phpVersionSupported,
    ],
    'extensions' => $extensions,
    'runtime' => [
        'allow_url_fopen' => $allowUrlFopen,
        'outbound_http_transport_available' => $outboundHttpSupported,
        'temporary_directory_writable' => $temporaryDirectoryWritable,
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'post_max_size' => ini_get('post_max_size'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
    ],
    'next' => 'Record this result, then delete gibyeol-preflight.php from the server.',
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
