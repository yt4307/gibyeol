<?php

declare(strict_types=1);

namespace App\Operations;

use App\Email\EmailCrypto;
use App\Email\EmailSender;
use App\Email\EncryptedEmail;
use Doctrine\DBAL\Connection;
use Symfony\Component\Lock\LockFactory;

final class ChristmasPostman
{
    private const CAMPAIGN = 'christmas-2026';

    public function __construct(
        private readonly ChainIndex $chainIndex,
        private readonly Connection $connection,
        private readonly EmailCrypto $emailCrypto,
        private readonly EmailSender $emailSender,
        private readonly LockFactory $lockFactory,
        private readonly int $unlockAt,
    ) {
    }

    /** @return array{safeBlock: int, recipients: int, sent: int, skipped: int, failed: int} */
    public function run(?int $now = null): array
    {
        $now ??= time();
        if ($now < $this->unlockAt) {
            throw new \RuntimeException('Christmas Postman cannot run before UNLOCK_AT.');
        }
        $lock = $this->lockFactory->createLock('gibyeol-christmas-postman', 900);
        if (!$lock->acquire()) {
            throw new \RuntimeException('Another Christmas Postman run is active.');
        }
        try {
            $snapshot = $this->chainIndex->snapshot();
            $sent = $skipped = $failed = 0;
            foreach ($snapshot->recipientCounts as $wallet => $count) {
                $mailbox = $this->connection->fetchAssociative('SELECT email_ciphertext, email_iv, email_tag, email_lookup_hash FROM mailboxes WHERE wallet_address = ?', [$wallet]);
                if (false === $mailbox || !$this->claim($wallet, $count)) {
                    ++$skipped;
                    continue;
                }
                try {
                    $email = $this->emailCrypto->decrypt(new EncryptedEmail(
                        (string) $mailbox['email_ciphertext'],
                        (string) $mailbox['email_iv'],
                        (string) $mailbox['email_tag'],
                        (string) $mailbox['email_lookup_hash'],
                    ), $wallet);
                    $idempotencyKey = 'gibyeol/'.self::CAMPAIGN.'/'.$wallet;
                    $messageId = $this->emailSender->sendChristmasNotification($email, $count, $idempotencyKey);
                    $this->connection->executeStatement("UPDATE notifications SET status = 'sent', provider_message_id = ?, sent_at = UTC_TIMESTAMP(6), updated_at = UTC_TIMESTAMP(6), next_retry_at = NULL WHERE campaign = ? AND wallet_address = ? AND status = 'claimed'", [$messageId, self::CAMPAIGN, $wallet]);
                    ++$sent;
                } catch (\Throwable) {
                    $this->connection->executeStatement("UPDATE notifications SET status = 'failed', attempt_count = attempt_count + 1, failed_at = UTC_TIMESTAMP(6), next_retry_at = DATE_ADD(UTC_TIMESTAMP(6), INTERVAL LEAST(3600, POW(2, attempt_count + 1) * 60) SECOND), updated_at = UTC_TIMESTAMP(6) WHERE campaign = ? AND wallet_address = ? AND status = 'claimed'", [self::CAMPAIGN, $wallet]);
                    ++$failed;
                }
            }
            return ['safeBlock' => $snapshot->safeBlock, 'recipients' => count($snapshot->recipientCounts), 'sent' => $sent, 'skipped' => $skipped, 'failed' => $failed];
        } finally {
            $lock->release();
        }
    }

    private function claim(string $wallet, int $count): bool
    {
        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s.u');
        $this->connection->executeStatement("INSERT IGNORE INTO notifications (campaign, wallet_address, letter_count, status, attempt_count, created_at, updated_at) VALUES (?, ?, ?, 'pending', 0, ?, ?)", [self::CAMPAIGN, $wallet, $count, $now, $now]);
        return 1 === $this->connection->executeStatement("UPDATE notifications SET status = 'claimed', claimed_at = UTC_TIMESTAMP(6), letter_count = ?, updated_at = UTC_TIMESTAMP(6) WHERE campaign = ? AND wallet_address = ? AND (status = 'pending' OR (status = 'failed' AND (next_retry_at IS NULL OR next_retry_at <= UTC_TIMESTAMP(6))) OR (status = 'claimed' AND claimed_at < UTC_TIMESTAMP(6) - INTERVAL 15 MINUTE))", [$count, self::CAMPAIGN, $wallet]);
    }
}
