<?php

declare(strict_types=1);

namespace App\Email;

final readonly class EncryptedEmail
{
    public function __construct(
        public string $ciphertext,
        public string $iv,
        public string $tag,
        public string $lookupHash,
    ) {
    }
}
