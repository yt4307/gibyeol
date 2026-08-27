<?php

declare(strict_types=1);

namespace App\Auth;

use Zbkm\Siwe\Ethereum\Signature;
use Zbkm\Siwe\SiweMessage;

final class ZbkmSiweVerifier implements SiweVerifier
{
    public function verify(string $message, string $signature): ?VerifiedSiweMessage
    {
        try {
            $params = SiweMessage::parse($message);
            $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            if (!Signature::verifyMessage($message, $signature, $params->address)
                || (null !== $params->expirationTime && $params->expirationTime <= $now)
                || (null !== $params->notBefore && $params->notBefore > $now)
                || $params->issuedAt > $now->modify('+60 seconds')) {
                return null;
            }
            return new VerifiedSiweMessage(
                strtolower($params->address),
                $params->chainId,
                $params->domain,
                $params->uri,
                $params->nonce,
            );
        } catch (\Throwable) {
            return null;
        }
    }
}
