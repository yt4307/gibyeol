<?php

declare(strict_types=1);

namespace App\Auth;

interface SiweVerifier
{
    public function verify(string $message, string $signature): ?VerifiedSiweMessage;
}
