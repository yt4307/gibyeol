<?php

declare(strict_types=1);

namespace App\Auth;

final class AuthException extends \RuntimeException
{
    public function __construct(public readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }
}
