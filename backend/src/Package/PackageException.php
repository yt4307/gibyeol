<?php

declare(strict_types=1);

namespace App\Package;

final class PackageException extends \RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        public readonly int $status,
        string $message,
    ) {
        parent::__construct($message);
    }
}
