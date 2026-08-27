<?php

declare(strict_types=1);

namespace App\Operations;

final readonly class ChainSnapshot
{
    /** @param array<string, int> $recipientCounts @param array<string, true> $archiveHashes */
    public function __construct(
        public int $headBlock,
        public int $safeBlock,
        public array $recipientCounts,
        public array $archiveHashes,
    ) {
    }
}
