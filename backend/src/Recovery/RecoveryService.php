<?php

declare(strict_types=1);

namespace App\Recovery;

use Doctrine\DBAL\Connection;

final class RecoveryService
{
    private const EMAIL_PROOF_TTL_SECONDS = 600;

    private readonly string $recoveryPrivateKey;

    public function __construct(
        private readonly Connection $connection,
        private readonly MailboxKeyVerifier $mailboxKeyVerifier,
        string $recoveryPrivateKey,
        private readonly int $unlockAt,
    ) {
        $decoded = base64_decode($recoveryPrivateKey, true);
        if (false === $decoded || SODIUM_CRYPTO_BOX_SECRETKEYBYTES !== strlen($decoded)) {
            throw new \InvalidArgumentException('RECOVERY_PRIVATE_KEY must be base64-encoded 32 bytes.');
        }
        $this->recoveryPrivateKey = $decoded;
    }

    public function unwrap(
        string $walletAddress,
        int $keyId,
        string $recoveryCiphertext,
        string $clientPublicKey,
        ?int $now = null,
    ): string {
        $now ??= time();
        if ($now < $this->unlockAt) {
            throw new RecoveryException('RECOVERY_LOCKED', 'Recovery is not available before the unlock time.', 403);
        }
        if ($keyId < 1 || $keyId > 0xFFFFFFFF) {
            throw new RecoveryException('RECOVERY_REQUEST_INVALID', 'Recovery request is invalid.');
        }
        $recentVerification = $this->connection->fetchOne(
            'SELECT 1 FROM email_verifications WHERE wallet_address = ? AND verified_at IS NOT NULL AND verified_at > UTC_TIMESTAMP(6) - INTERVAL '.self::EMAIL_PROOF_TTL_SECONDS.' SECOND ORDER BY verified_at DESC LIMIT 1',
            [strtolower($walletAddress)],
        );
        if (false === $recentVerification) {
            throw new RecoveryException('EMAIL_PROOF_REQUIRED', 'A recent email verification is required.', 403);
        }

        $ciphertext = $this->base64UrlDecode($recoveryCiphertext);
        $clientKey = $this->base64UrlDecode($clientPublicKey);
        if (SODIUM_CRYPTO_BOX_PUBLICKEYBYTES !== strlen($clientKey)) {
            throw new RecoveryException('RECOVERY_REQUEST_INVALID', 'Recovery request is invalid.');
        }

        $recoveryPublicKey = sodium_crypto_scalarmult_base($this->recoveryPrivateKey);
        $recoveryKeypair = sodium_crypto_box_keypair_from_secretkey_and_publickey(
            $this->recoveryPrivateKey,
            $recoveryPublicKey,
        );
        $seed = sodium_crypto_box_seal_open($ciphertext, $recoveryKeypair);
        sodium_memzero($recoveryKeypair);
        if (false === $seed || SODIUM_CRYPTO_BOX_SEEDBYTES !== strlen($seed)) {
            throw new RecoveryException('RECOVERY_CIPHERTEXT_INVALID', 'Recovery ciphertext could not be opened.');
        }

        try {
            $mailboxKeypair = sodium_crypto_box_seed_keypair($seed);
            $derivedPublicKey = sodium_crypto_box_publickey($mailboxKeypair);
            sodium_memzero($mailboxKeypair);
            $registeredPublicKey = $this->mailboxKeyVerifier->mailboxPublicKey($walletAddress, $keyId);
            if (!hash_equals($registeredPublicKey, $derivedPublicKey)) {
                throw new RecoveryException('MAILBOX_KEY_MISMATCH', 'Recovered key does not match the registered mailbox key.', 409);
            }
            return $this->base64UrlEncode(sodium_crypto_box_seal($seed, $clientKey));
        } finally {
            sodium_memzero($seed);
        }
    }

    private function base64UrlDecode(string $encoded): string
    {
        if ('' === $encoded || 1 !== preg_match('/^[A-Za-z0-9_-]+$/D', $encoded)) {
            throw new RecoveryException('RECOVERY_REQUEST_INVALID', 'Recovery request is invalid.');
        }
        $decoded = base64_decode(strtr($encoded, '-_', '+/').str_repeat('=', (4 - strlen($encoded) % 4) % 4), true);
        if (false === $decoded) {
            throw new RecoveryException('RECOVERY_REQUEST_INVALID', 'Recovery request is invalid.');
        }
        return $decoded;
    }

    private function base64UrlEncode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
