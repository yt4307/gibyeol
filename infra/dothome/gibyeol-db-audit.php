<?php

declare(strict_types=1);

use App\Kernel;
use Doctrine\DBAL\Connection;
use Symfony\Component\Dotenv\Dotenv;

header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; form-action 'self'; style-src 'unsafe-inline'");
ini_set('display_errors', '0');

$appRoot = __DIR__.'/_gibyeol';
$expectedTokenHash = '__DB_AUDIT_TOKEN_HASH__';

/** @param array<string, mixed> $body */
function respondJson(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

if ('GET' === ($_SERVER['REQUEST_METHOD'] ?? 'GET')) {
    header('Content-Type: text/html; charset=utf-8');
    echo <<<'HTML'
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>기별 DB 개인정보 감사</title></head>
<body><main><h1>기별 DB 개인정보 감사</h1><p>실제 값은 출력하지 않고 테이블별 집계만 조회합니다.</p>
<form method="post"><label>일회성 토큰 <input name="token" type="password" required autocomplete="off"></label>
<button type="submit">집계 조회</button></form></main></body>
</html>
HTML;
    exit;
}

if ('POST' !== ($_SERVER['REQUEST_METHOD'] ?? '')) {
    respondJson(405, ['status' => 'error', 'code' => 'method_not_allowed']);
}

$submittedToken = isset($_POST['token']) && is_string($_POST['token']) ? $_POST['token'] : '';
if (64 !== strlen($expectedTokenHash) || !hash_equals($expectedTokenHash, hash('sha256', $submittedToken))) {
    usleep(500_000);
    respondJson(403, ['status' => 'error', 'code' => 'invalid_or_expired_token']);
}

try {
    require $appRoot.'/vendor/autoload.php';
    (new Dotenv())->bootEnv($appRoot.'/.env');

    $environment = $_SERVER['APP_ENV'] ?? $_ENV['APP_ENV'] ?? 'prod';
    $kernel = new Kernel((string) $environment, false);
    $kernel->boot();
    $connection = $kernel->getContainer()->get('doctrine')->getConnection();
    $summary = auditDatabase($connection);
    $runnerDeleted = @unlink(__FILE__);

    respondJson(200, [
        'status' => 'ok',
        'value_exposure' => 'aggregate_counts_only',
        'tables' => $summary,
        'runner_deleted' => $runnerDeleted,
        'next' => 'Delete gibyeol-db-audit.php from the server if runner_deleted is false.',
    ]);
} catch (Throwable $error) {
    respondJson(200, [
        'status' => 'error',
        'code' => 'database_audit_failed',
        'exception_class' => $error::class,
        'next' => 'Delete gibyeol-db-audit.php unless retry is immediate.',
    ]);
}

/** @return array<string, array<string, int>> */
function auditDatabase(Connection $connection): array
{
    return [
        'auth_nonces' => aggregate($connection, <<<'SQL'
SELECT COUNT(*) AS rows_count,
       COUNT(DISTINCT wallet_address) AS distinct_wallets,
       SUM(used_at IS NULL) AS unused_rows,
       SUM(expires_at < UTC_TIMESTAMP(6)) AS expired_rows
FROM auth_nonces
SQL),
        'sessions' => aggregate($connection, <<<'SQL'
SELECT COUNT(*) AS rows_count,
       COUNT(DISTINCT wallet_address) AS distinct_wallets,
       SUM(expires_at >= UTC_TIMESTAMP(6)) AS active_rows,
       SUM(expires_at < UTC_TIMESTAMP(6)) AS expired_rows
FROM sessions
SQL),
        'mailboxes' => aggregate($connection, <<<'SQL'
SELECT COUNT(*) AS rows_count,
       COUNT(DISTINCT wallet_address) AS distinct_wallets,
       COUNT(DISTINCT email_lookup_hash) AS distinct_email_hashes,
       SUM(LENGTH(email_ciphertext) > 0 AND LENGTH(email_iv) = 12 AND LENGTH(email_tag) = 16) AS encrypted_email_rows
FROM mailboxes
SQL),
        'email_verifications' => aggregate($connection, <<<'SQL'
SELECT COUNT(*) AS rows_count,
       COUNT(DISTINCT wallet_address) AS distinct_wallets,
       COUNT(DISTINCT email_lookup_hash) AS distinct_email_hashes,
       SUM(verified_at IS NOT NULL) AS verified_rows,
       SUM(expires_at < UTC_TIMESTAMP(6)) AS expired_rows,
       SUM(LENGTH(request_ip_hash) = 32) AS hashed_ip_rows
FROM email_verifications
SQL),
        'notifications' => aggregate($connection, <<<'SQL'
SELECT COUNT(*) AS rows_count,
       COUNT(DISTINCT wallet_address) AS distinct_wallets,
       SUM(provider_message_id IS NOT NULL) AS provider_message_rows,
       SUM(delivered_at IS NOT NULL) AS delivered_rows,
       SUM(failed_at IS NOT NULL) AS failed_rows
FROM notifications
SQL),
        'webhook_events' => aggregate($connection, <<<'SQL'
SELECT COUNT(*) AS rows_count,
       COUNT(DISTINCT event_id) AS distinct_event_ids
FROM webhook_events
SQL),
    ];
}

/** @return array<string, int> */
function aggregate(Connection $connection, string $sql): array
{
    $row = $connection->fetchAssociative($sql);
    if (false === $row) {
        return [];
    }

    return array_map(static fn (mixed $value): int => (int) ($value ?? 0), $row);
}
