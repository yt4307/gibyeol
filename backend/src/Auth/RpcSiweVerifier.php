<?php

declare(strict_types=1);

namespace App\Auth;

use App\Http\JsonRpcClient;
use kornrunner\Keccak;

final class RpcSiweVerifier implements SiweVerifier
{
    private const ECRECOVER_ADDRESS = '0x0000000000000000000000000000000000000001';
    private const SECP256K1_HALF_ORDER = '7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0';

    public function __construct(
        private readonly JsonRpcClient $rpcClient,
    ) {
    }

    public function verify(string $message, string $signature): ?VerifiedSiweMessage
    {
        try {
            $parsed = SiweMessage::parse($message);
            $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            if ($parsed->expirationTime <= $now || $parsed->issuedAt > $now->modify('+60 seconds')) {
                return null;
            }

            $address = $this->recoverAddress($message, $signature);
            if (null === $address || !hash_equals($parsed->address, $address)) {
                return null;
            }

            return new VerifiedSiweMessage(
                $parsed->address,
                $parsed->chainId,
                $parsed->domain,
                $parsed->uri,
                $parsed->nonce,
            );
        } catch (\Throwable) {
            return null;
        }
    }

    private function recoverAddress(string $message, string $signature): ?string
    {
        if (1 !== preg_match('/\A0x(?<r>[0-9A-Fa-f]{64})(?<s>[0-9A-Fa-f]{64})(?<v>[0-9A-Fa-f]{2})\z/D', $signature, $parts)) {
            return null;
        }
        $r = strtolower($parts['r']);
        $s = strtolower($parts['s']);
        $v = hexdec($parts['v']);
        if (!in_array($v, [27, 28], true)
            || str_repeat('0', 64) === $r
            || str_repeat('0', 64) === $s
            || strcmp($s, self::SECP256K1_HALF_ORDER) > 0) {
            return null;
        }

        $hash = Keccak::hash("\x19Ethereum Signed Message:\n".strlen($message).$message, 256);
        $calldata = '0x'.$hash.str_pad(dechex($v), 64, '0', STR_PAD_LEFT).$r.$s;
        try {
            $result = $this->rpcClient->requestConsistent('eth_call', [[
                'to' => self::ECRECOVER_ADDRESS,
                'data' => $calldata,
            ], 'latest']);
        } catch (\Throwable) {
            return null;
        }
        if (is_string($result) && 1 === preg_match('/\A0x[0-9A-Fa-f]{64}\z/D', $result)) {
            $address = '0x'.strtolower(substr($result, -40));

            return '0x'.str_repeat('0', 40) === $address ? null : $address;
        }

        return null;
    }
}
