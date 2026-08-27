<?php

declare(strict_types=1);

namespace App\Auth;

use Doctrine\DBAL\Connection;
use Zbkm\Siwe\SiweMessage;
use Zbkm\Siwe\SiweMessageParams;

final class AuthService
{
    private const NONCE_TTL_SECONDS = 300;
    private const SESSION_TTL_SECONDS = 86_400;

    private readonly string $domain;

    public function __construct(
        private readonly Connection $connection,
        private readonly SiweVerifier $verifier,
        private readonly string $webOrigin,
        private readonly int $chainId,
    ) {
        $host = parse_url($webOrigin, PHP_URL_HOST);
        $port = parse_url($webOrigin, PHP_URL_PORT);
        if (!is_string($host)) {
            throw new \InvalidArgumentException('WEB_ORIGIN is invalid.');
        }
        $this->domain = $host.(is_int($port) ? ':'.$port : '');
    }

    /** @return array{message: string, nonce: string, expiresAt: string} */
    public function challenge(string $walletAddress, int $requestedChainId): array
    {
        $walletAddress = $this->normalizeAddress($walletAddress);
        if ($requestedChainId !== $this->chainId) {
            throw new AuthException('CHAIN_NOT_ALLOWED', 'The requested chain is not allowed.');
        }

        $nonce = bin2hex(random_bytes(16));
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $expiresAt = $now->modify('+'.self::NONCE_TTL_SECONDS.' seconds');
        $params = new SiweMessageParams(
            address: $walletAddress,
            chainId: $this->chainId,
            domain: $this->domain,
            uri: $this->webOrigin,
            issuedAt: $now,
            nonce: $nonce,
            statement: 'Sign in to the Gibyeol 2026 post office.',
            expirationTime: $expiresAt,
        );
        $this->connection->insert('auth_nonces', [
            'nonce_hash' => hash('sha256', $nonce, true),
            'wallet_address' => $walletAddress,
            'chain_id' => $this->chainId,
            'expires_at' => $this->formatDate($expiresAt),
            'used_at' => null,
            'created_at' => $this->formatDate($now),
        ]);

        return [
            'message' => SiweMessage::create($params),
            'nonce' => $nonce,
            'expiresAt' => $expiresAt->format(\DateTimeInterface::ATOM),
        ];
    }

    /** @return array{token: string, walletAddress: string, expiresAt: \DateTimeImmutable} */
    public function verify(string $message, string $signature): array
    {
        $verified = $this->verifier->verify($message, $signature);
        if (null === $verified
            || $verified->chainId !== $this->chainId
            || !hash_equals($this->domain, $verified->domain)
            || !hash_equals($this->webOrigin, $verified->uri)) {
            throw new AuthException('SIWE_INVALID', 'The SIWE message or signature is invalid.');
        }

        return $this->connection->transactional(function () use ($verified): array {
            $nonceHash = hash('sha256', $verified->nonce, true);
            $row = $this->connection->fetchAssociative(
                'SELECT wallet_address, chain_id, expires_at, used_at FROM auth_nonces WHERE nonce_hash = ? FOR UPDATE',
                [$nonceHash],
            );
            $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            if (false === $row
                || null !== $row['used_at']
                || strtolower((string) $row['wallet_address']) !== $verified->address
                || (int) $row['chain_id'] !== $this->chainId
                || new \DateTimeImmutable((string) $row['expires_at'], new \DateTimeZone('UTC')) <= $now) {
                throw new AuthException('SIWE_NONCE_INVALID', 'The SIWE nonce is expired or already used.');
            }

            $this->connection->update('auth_nonces', ['used_at' => $this->formatDate($now)], ['nonce_hash' => $nonceHash]);
            $tokenBytes = random_bytes(32);
            $token = rtrim(strtr(base64_encode($tokenBytes), '+/', '-_'), '=');
            $expiresAt = $now->modify('+'.self::SESSION_TTL_SECONDS.' seconds');
            $this->connection->insert('sessions', [
                'token_hash' => hash('sha256', $token, true),
                'wallet_address' => $verified->address,
                'expires_at' => $this->formatDate($expiresAt),
                'created_at' => $this->formatDate($now),
                'last_seen_at' => $this->formatDate($now),
            ]);

            return ['token' => $token, 'walletAddress' => $verified->address, 'expiresAt' => $expiresAt];
        });
    }

    public function resolveSession(string $token): ?string
    {
        if (1 !== preg_match('/^[A-Za-z0-9_-]{43}$/D', $token)) {
            return null;
        }
        $row = $this->connection->fetchAssociative(
            'SELECT wallet_address FROM sessions WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP(6)',
            [hash('sha256', $token, true)],
        );
        return false === $row ? null : (string) $row['wallet_address'];
    }

    public function logout(?string $token): void
    {
        if (null !== $token) {
            $this->connection->delete('sessions', ['token_hash' => hash('sha256', $token, true)]);
        }
    }

    private function normalizeAddress(string $walletAddress): string
    {
        if (1 !== preg_match('/^0x[0-9a-fA-F]{40}$/D', $walletAddress)) {
            throw new AuthException('WALLET_ADDRESS_INVALID', 'Wallet address must contain 20 bytes.');
        }
        return strtolower($walletAddress);
    }

    private function formatDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d H:i:s.u');
    }
}
