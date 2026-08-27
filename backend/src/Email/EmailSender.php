<?php

declare(strict_types=1);

namespace App\Email;

interface EmailSender
{
    public function sendVerificationCode(string $email, string $code): void;

    public function sendChristmasNotification(string $email, int $letterCount, string $idempotencyKey): string;
}
