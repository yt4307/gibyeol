<?php

declare(strict_types=1);

namespace App\Email;

final class ConfiguredEmailSender implements EmailSender
{
    public function __construct(
        private readonly string $emailProvider,
        private readonly string $resendApiKey,
        private readonly string $emailFrom,
    ) {
    }

    public function sendVerificationCode(string $email, string $code): void
    {
        if ('null' === $this->emailProvider) {
            return;
        }
        $this->send([
            'from' => $this->emailFrom,
            'to' => [$email],
            'subject' => '기별 이메일 인증 코드',
            'text' => "기별 인증 코드는 {$code}입니다. 10분 안에 입력해 주세요.",
        ]);
    }

    public function sendChristmasNotification(string $email, int $letterCount, string $idempotencyKey): string
    {
        if ('null' === $this->emailProvider) {
            return 'null_'.substr(hash('sha256', $idempotencyKey), 0, 24);
        }
        return $this->send([
            'from' => $this->emailFrom,
            'to' => [$email],
            'subject' => '기별이 도착했습니다',
            'text' => "기다리던 기별 {$letterCount}통이 도착했습니다. 지갑과 Passkey로 확인해 주세요.",
        ], $idempotencyKey);
    }

    /** @param array<string, mixed> $message */
    private function send(array $message, ?string $idempotencyKey = null): string
    {
        if ('resend' !== $this->emailProvider || '' === $this->resendApiKey) {
            throw new \RuntimeException('Email provider is not configured.');
        }
        $body = json_encode($message, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $headers = "Authorization: Bearer {$this->resendApiKey}\r\nContent-Type: application/json\r\n";
        if (null !== $idempotencyKey) {
            $headers .= "Idempotency-Key: {$idempotencyKey}\r\n";
        }
        $context = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => $headers,
            'content' => $body,
            'timeout' => 10,
            'ignore_errors' => true,
        ]]);
        $response = @file_get_contents('https://api.resend.com/emails', false, $context);
        $statusLine = $http_response_header[0] ?? '';
        if (false === $response || 1 !== preg_match('/^HTTP\/\S+ 2\d\d /', $statusLine)) {
            throw new \RuntimeException('Email provider request failed.');
        }
        $decoded = json_decode($response, true, 16, JSON_THROW_ON_ERROR);
        $id = is_array($decoded) ? ($decoded['id'] ?? null) : null;
        if (!is_string($id) || '' === $id) {
            throw new \RuntimeException('Email provider response is invalid.');
        }
        return $id;
    }
}
