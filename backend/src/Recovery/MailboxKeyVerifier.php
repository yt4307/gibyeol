<?php

declare(strict_types=1);

namespace App\Recovery;

interface MailboxKeyVerifier
{
    public function mailboxPublicKey(string $walletAddress, int $keyId): string;
}
