<?php

declare(strict_types=1);

namespace App\Auth;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimit;
use Symfony\Component\RateLimiter\RateLimiterFactory;

final readonly class AuthRequestLimiter
{
    public function __construct(
        private RateLimiterFactory $authChallengeLimiter,
        private RateLimiterFactory $authVerifyLimiter,
        private string $appSecret,
    ) {
        if (strlen($appSecret) < 16) {
            throw new \InvalidArgumentException('APP_SECRET must contain at least 16 bytes.');
        }
    }

    public function consumeChallenge(Request $request): RateLimit
    {
        return $this->authChallengeLimiter->create($this->clientKey($request))->consume();
    }

    public function consumeVerify(Request $request): RateLimit
    {
        return $this->authVerifyLimiter->create($this->clientKey($request))->consume();
    }

    private function clientKey(Request $request): string
    {
        return hash_hmac('sha256', $request->getClientIp() ?? 'unknown', $this->appSecret);
    }
}
