<?php

declare(strict_types=1);

namespace App\Email;

final readonly class VerifiedWebhook
{
    /** @param array<string, mixed> $payload */
    public function __construct(
        public string $eventId,
        public array $payload,
    ) {
    }
}
