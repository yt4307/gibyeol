<?php

declare(strict_types=1);

use App\Kernel;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use Symfony\Component\Dotenv\Dotenv;

header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; form-action 'self'; style-src 'unsafe-inline'");
ini_set('display_errors', '0');

$appRoot = __DIR__.'/_gibyeol';
$tokenPath = $appRoot.'/var/migration-token';
$lockPath = $appRoot.'/var/migration.lock';

/** @param array<string, mixed> $body */
function respondJson(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function failureType(Throwable $error): string
{
    $class = strtolower($error::class);
    $message = strtolower($error->getMessage());
    if (str_contains($class, 'pdo') || str_contains($class, 'dbal') || str_contains($message, 'database')) {
        return 'database';
    }
    if (str_contains($message, 'permission denied') || str_contains($message, 'not writable')) {
        return 'filesystem_permission';
    }
    if (str_contains($message, 'environment variable') || str_contains($message, '.env')) {
        return 'environment_configuration';
    }

    return 'runtime';
}

if ('GET' === ($_SERVER['REQUEST_METHOD'] ?? 'GET')) {
    header('Content-Type: text/html; charset=utf-8');
    echo <<<'HTML'
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>기별 DB 초기화</title></head>
<body><main><h1>기별 DB 초기화</h1><p>로컬 migration-token 파일의 값을 입력하세요.</p>
<form method="post"><label>일회성 토큰 <input name="token" type="password" required autocomplete="off"></label>
<button type="submit">Migration 실행</button></form></main></body>
</html>
HTML;
    exit;
}

if ('POST' !== ($_SERVER['REQUEST_METHOD'] ?? '')) {
    respondJson(405, ['status' => 'error', 'code' => 'method_not_allowed']);
}

$expectedToken = is_readable($tokenPath) ? trim((string) file_get_contents($tokenPath)) : '';
$submittedToken = isset($_POST['token']) && is_string($_POST['token']) ? $_POST['token'] : '';
if (64 !== strlen($expectedToken) || !hash_equals($expectedToken, $submittedToken)) {
    usleep(500_000);
    respondJson(403, ['status' => 'error', 'code' => 'invalid_or_expired_token']);
}

$lock = @fopen($lockPath, 'c');
if (false === $lock || !flock($lock, LOCK_EX | LOCK_NB)) {
    if (is_resource($lock)) {
        fclose($lock);
    }
    respondJson(409, ['status' => 'error', 'code' => 'migration_already_running']);
}

try {
    require $appRoot.'/vendor/autoload.php';
    (new Dotenv())->bootEnv($appRoot.'/.env');

    $environment = $_SERVER['APP_ENV'] ?? $_ENV['APP_ENV'] ?? 'prod';
    $kernel = new Kernel((string) $environment, false);
    $application = new Application($kernel);
    $application->setAutoExit(false);
    $application->setCatchExceptions(false);
    $exitCode = $application->run(new ArrayInput([
        'command' => 'doctrine:migrations:migrate',
        '--no-interaction' => true,
        '--allow-no-migration' => true,
    ]), new NullOutput());

    if (0 !== $exitCode) {
        throw new RuntimeException('Migration command returned a non-zero exit code.');
    }

    $tokenDeleted = @unlink($tokenPath);
    flock($lock, LOCK_UN);
    fclose($lock);
    respondJson(200, [
        'status' => 'ok',
        'migration' => 'complete',
        'token_deleted' => $tokenDeleted,
        'next' => 'Delete gibyeol-migrate.php and migration.lock from the server.',
    ]);
} catch (Throwable $error) {
    flock($lock, LOCK_UN);
    fclose($lock);
    respondJson(500, [
        'status' => 'error',
        'code' => 'migration_failed',
        'failure_type' => failureType($error),
        'exception_class' => $error::class,
        'next' => 'Record this result without sharing secrets, then delete gibyeol-migrate.php if retry is not immediate.',
    ]);
}
