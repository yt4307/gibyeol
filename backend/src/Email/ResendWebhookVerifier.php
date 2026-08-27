<?php

declare(strict_types=1);

namespace App\Email;

final class ResendWebhookVerifier
{
    private const MAX_AGE_SECONDS = 300;

    private readonly string $secret;

    public function __construct(string $resendWebhookSecret)
    {
        $encoded = str_starts_with($resendWebhookSecret, 'whsec_')
            ? substr($resendWebhookSecret, 6)
            : $resendWebhookSecret;
        $decoded = base64_decode($encoded, true);
        if (false === $decoded || strlen($decoded) < 16) {
            throw new \InvalidArgumentException('RESEND_WEBHOOK_SECRET is invalid.');
        }
        $this->secret = $decoded;
    }

    public function verify(string $rawBody, ?string $eventId, ?string $timestamp, ?string $signature, ?int $now = null): VerifiedWebhook
    {
        if (null === $eventId || 1 !== preg_match('/^[A-Za-z0-9_-]{1,255}$/D', $eventId)
            || null === $timestamp || 1 !== preg_match('/^\d{10}$/D', $timestamp)
            || abs(($now ?? time()) - (int) $timestamp) > self::MAX_AGE_SECONDS
            || null === $signature) {
            throw new EmailException('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid.', 401);
        }

        $expected = base64_encode(hash_hmac('sha256', $eventId.'.'.$timestamp.'.'.$rawBody, $this->secret, true));
        $valid = false;
        foreach (preg_split('/\s+/', trim($signature)) ?: [] as $candidate) {
            if (str_starts_with($candidate, 'v1,') && hash_equals($expected, substr($candidate, 3))) {
                $valid = true;
            }
        }
        if (!$valid) {
            throw new EmailException('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid.', 401);
        }
        try {
            $payload = json_decode($rawBody, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            throw new EmailException('WEBHOOK_PAYLOAD_INVALID', 'Webhook payload is invalid.', 400);
        }
        if (!is_array($payload)) {
            throw new EmailException('WEBHOOK_PAYLOAD_INVALID', 'Webhook payload is invalid.', 400);
        }
        return new VerifiedWebhook($eventId, $payload);
    }
}
