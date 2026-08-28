<?php

declare(strict_types=1);

namespace App\Auth;

use App\Http\HttpClient;
use kornrunner\Keccak;

final class RpcSiweVerifier implements SiweVerifier
{
    private const ECRECOVER_ADDRESS = '0x0000000000000000000000000000000000000001';
    private const SECP256K1_HALF_ORDER = '7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0';

    public function __construct(
        private readonly HttpClient $httpClient,
        private readonly string $rpcUrl,
        private readonly string $rpcFallbackUrl,
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
        $payload = json_encode([
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'eth_call',
            'params' => [[
                'to' => self::ECRECOVER_ADDRESS,
                'data' => $calldata,
            ], 'latest'],
        ], JSON_THROW_ON_ERROR);

        foreach (array_values(array_unique(array_filter([$this->rpcUrl, $this->rpcFallbackUrl]))) as $rpcUrl) {
            try {
                $response = $this->httpClient->post($rpcUrl, $payload, ['Content-Type: application/json'], 10);
                if (!$response->isSuccessful()) {
                    continue;
                }
                $decoded = json_decode($response->body, true, 16, JSON_THROW_ON_ERROR);
                $result = is_array($decoded) ? ($decoded['result'] ?? null) : null;
                if (is_string($result) && 1 === preg_match('/\A0x[0-9A-Fa-f]{64}\z/D', $result)) {
                    $address = '0x'.strtolower(substr($result, -40));

                    return '0x'.str_repeat('0', 40) === $address ? null : $address;
                }
            } catch (\Throwable) {
                // Try the next endpoint without exposing credential-bearing URLs.
            }
        }

        return null;
    }
}
