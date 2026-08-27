<?php

declare(strict_types=1);

namespace App\Email;

use Doctrine\DBAL\Connection;

final class EmailService
{
    private const OTP_TTL_SECONDS = 600;
    private const CHALLENGE_LIMIT = 3;
    private const MAX_ATTEMPTS = 5;

    public function __construct(
        private readonly Connection $connection,
        private readonly EmailCrypto $crypto,
        private readonly EmailSender $sender,
        private readonly string $otpHmacKey,
    ) {
        if (strlen($otpHmacKey) < 16) {
            throw new \InvalidArgumentException('OTP_HMAC_KEY must contain at least 16 bytes.');
        }
    }

    public function challenge(string $walletAddress, string $email, string $requestIp): void
    {
        $walletAddress = strtolower($walletAddress);
        $normalized = $this->crypto->normalize($email);
        $encrypted = $this->crypto->encrypt($normalized, $walletAddress);
        $requestIpHash = hash_hmac('sha256', $requestIp, $this->otpHmacKey, true);
        $recentCount = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM email_verifications WHERE created_at > UTC_TIMESTAMP(6) - INTERVAL 10 MINUTE AND (wallet_address = ? OR email_lookup_hash = ? OR request_ip_hash = ?)',
            [$walletAddress, $encrypted->lookupHash, $requestIpHash],
        );
        if ($recentCount >= self::CHALLENGE_LIMIT) {
            throw new EmailException('EMAIL_RATE_LIMITED', 'Too many verification requests.', 429);
        }

        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $this->connection->insert('email_verifications', [
            'wallet_address' => $walletAddress,
            'email_ciphertext' => $encrypted->ciphertext,
            'email_iv' => $encrypted->iv,
            'email_tag' => $encrypted->tag,
            'email_lookup_hash' => $encrypted->lookupHash,
            'request_ip_hash' => $requestIpHash,
            'code_hash' => $this->codeHash($walletAddress, $code),
            'expires_at' => $this->formatDate($now->modify('+'.self::OTP_TTL_SECONDS.' seconds')),
            'attempts' => 0,
            'verified_at' => null,
            'created_at' => $this->formatDate($now),
        ]);

        try {
            $this->sender->sendVerificationCode($normalized, $code);
        } finally {
            sodium_memzero($code);
        }
    }

    public function verify(string $walletAddress, string $code): void
    {
        $walletAddress = strtolower($walletAddress);
        if (1 !== preg_match('/^\d{6}$/D', $code)) {
            throw new EmailException('EMAIL_CODE_INVALID', 'The verification code is invalid.');
        }

        $result = $this->connection->transactional(function () use ($walletAddress, $code): string {
            $row = $this->connection->fetchAssociative(
                'SELECT * FROM email_verifications WHERE wallet_address = ? AND verified_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE',
                [$walletAddress],
            );
            $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            if (false === $row || (int) $row['attempts'] >= self::MAX_ATTEMPTS
                || new \DateTimeImmutable((string) $row['expires_at'], new \DateTimeZone('UTC')) <= $now) {
                return 'expired';
            }

            $attempts = (int) $row['attempts'] + 1;
            $this->connection->update('email_verifications', ['attempts' => $attempts], ['id' => $row['id']]);
            if (!hash_equals((string) $row['code_hash'], $this->codeHash($walletAddress, $code))) {
                return 'invalid';
            }

            $verifiedAt = $this->formatDate($now);
            $this->connection->update('email_verifications', ['verified_at' => $verifiedAt], ['id' => $row['id']]);
            $this->connection->executeStatement(
                'INSERT INTO mailboxes (wallet_address, email_ciphertext, email_iv, email_tag, email_lookup_hash, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email_ciphertext = VALUES(email_ciphertext), email_iv = VALUES(email_iv), email_tag = VALUES(email_tag), email_lookup_hash = VALUES(email_lookup_hash), email_verified_at = VALUES(email_verified_at), updated_at = VALUES(updated_at)',
                [$walletAddress, $row['email_ciphertext'], $row['email_iv'], $row['email_tag'], $row['email_lookup_hash'], $verifiedAt, $verifiedAt, $verifiedAt],
            );
            return 'verified';
        });
        if ('expired' === $result) {
            throw new EmailException('EMAIL_CODE_EXPIRED', 'The verification code is expired.');
        }
        if ('invalid' === $result) {
            throw new EmailException('EMAIL_CODE_INVALID', 'The verification code is invalid.');
        }
    }

    private function codeHash(string $walletAddress, string $code): string
    {
        return hash_hmac('sha256', $walletAddress."\0".$code, $this->otpHmacKey, true);
    }

    private function formatDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d H:i:s.u');
    }
}
