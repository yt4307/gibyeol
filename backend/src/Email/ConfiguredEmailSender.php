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
        if ('resend' !== $this->emailProvider || '' === $this->resendApiKey) {
            throw new \RuntimeException('Email provider is not configured.');
        }
        $body = json_encode([
            'from' => $this->emailFrom,
            'to' => [$email],
            'subject' => '기별 이메일 인증 코드',
            'text' => "기별 인증 코드는 {$code}입니다. 10분 안에 입력해 주세요.",
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $context = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Authorization: Bearer {$this->resendApiKey}\r\nContent-Type: application/json\r\n",
            'content' => $body,
            'timeout' => 10,
            'ignore_errors' => true,
        ]]);
        $response = @file_get_contents('https://api.resend.com/emails', false, $context);
        $statusLine = $http_response_header[0] ?? '';
        if (false === $response || 1 !== preg_match('/^HTTP\/\S+ 2\d\d /', $statusLine)) {
            throw new \RuntimeException('Email provider request failed.');
        }
    }
}
