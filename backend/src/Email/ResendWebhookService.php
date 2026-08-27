<?php

declare(strict_types=1);

namespace App\Email;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

final class ResendWebhookService
{
    public function __construct(
        private readonly Connection $connection,
        private readonly ResendWebhookVerifier $verifier,
    ) {
    }

    public function handle(string $rawBody, ?string $eventId, ?string $timestamp, ?string $signature): bool
    {
        $verified = $this->verifier->verify($rawBody, $eventId, $timestamp, $signature);
        try {
            return $this->connection->transactional(function () use ($verified): bool {
                $this->connection->insert('webhook_events', [
                    'event_id' => $verified->eventId,
                    'provider' => 'resend',
                    'received_at' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s.u'),
                ]);
                $type = $verified->payload['type'] ?? null;
                $data = $verified->payload['data'] ?? null;
                $messageId = is_array($data) ? ($data['email_id'] ?? null) : null;
                if (!is_string($type) || !is_string($messageId) || '' === $messageId) {
                    return true;
                }
                if ('email.delivered' === $type) {
                    $this->connection->executeStatement("UPDATE notifications SET status = 'delivered', delivered_at = COALESCE(delivered_at, UTC_TIMESTAMP(6)), updated_at = UTC_TIMESTAMP(6) WHERE provider_message_id = ?", [$messageId]);
                } elseif (in_array($type, ['email.bounced', 'email.failed'], true)) {
                    $this->connection->executeStatement("UPDATE notifications SET status = 'failed', failed_at = COALESCE(failed_at, UTC_TIMESTAMP(6)), updated_at = UTC_TIMESTAMP(6) WHERE provider_message_id = ?", [$messageId]);
                } elseif ('email.sent' === $type) {
                    $this->connection->executeStatement("UPDATE notifications SET status = 'sent', sent_at = COALESCE(sent_at, UTC_TIMESTAMP(6)), updated_at = UTC_TIMESTAMP(6) WHERE provider_message_id = ? AND status NOT IN ('delivered', 'failed')", [$messageId]);
                }
                return true;
            });
        } catch (UniqueConstraintViolationException) {
            return false;
        }
    }
}
