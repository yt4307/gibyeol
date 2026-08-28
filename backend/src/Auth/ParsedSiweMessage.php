<?php

declare(strict_types=1);

namespace App\Auth;

final readonly class ParsedSiweMessage
{
    public function __construct(
        public string $address,
        public int $chainId,
        public string $domain,
        public string $uri,
        public string $nonce,
        public \DateTimeImmutable $issuedAt,
        public \DateTimeImmutable $expirationTime,
    ) {
    }
}
