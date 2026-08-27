<?php

declare(strict_types=1);

namespace App\Email;

final class EmailCrypto
{
    private readonly string $encryptionKey;

    public function __construct(
        string $emailEncryptionKey,
        private readonly string $emailLookupKey,
    ) {
        $decoded = base64_decode($emailEncryptionKey, true);
        if (false === $decoded || 32 !== strlen($decoded)) {
            throw new \InvalidArgumentException('EMAIL_ENCRYPTION_KEY must be base64-encoded 32 bytes.');
        }
        if (strlen($emailLookupKey) < 16) {
            throw new \InvalidArgumentException('EMAIL_LOOKUP_KEY must contain at least 16 bytes.');
        }
        $this->encryptionKey = $decoded;
    }

    public function normalize(string $email): string
    {
        $normalized = mb_strtolower(trim($email), 'UTF-8');
        if (false === filter_var($normalized, FILTER_VALIDATE_EMAIL) || strlen($normalized) > 254) {
            throw new \InvalidArgumentException('Email address is invalid.');
        }
        return $normalized;
    }

    public function encrypt(string $email, string $walletAddress): EncryptedEmail
    {
        $normalized = $this->normalize($email);
        $iv = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt(
            $normalized,
            'aes-256-gcm',
            $this->encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            'GIBYEOL/EMAIL/V1'.strtolower($walletAddress),
            16,
        );
        if (false === $ciphertext) {
            throw new \RuntimeException('Email encryption failed.');
        }
        return new EncryptedEmail(
            $ciphertext,
            $iv,
            $tag,
            hash_hmac('sha256', $normalized, $this->emailLookupKey, true),
        );
    }

    public function decrypt(EncryptedEmail $encrypted, string $walletAddress): string
    {
        $plaintext = openssl_decrypt(
            $encrypted->ciphertext,
            'aes-256-gcm',
            $this->encryptionKey,
            OPENSSL_RAW_DATA,
            $encrypted->iv,
            $encrypted->tag,
            'GIBYEOL/EMAIL/V1'.strtolower($walletAddress),
        );
        if (false === $plaintext) {
            throw new \RuntimeException('Email authentication failed.');
        }
        return $plaintext;
    }
}
