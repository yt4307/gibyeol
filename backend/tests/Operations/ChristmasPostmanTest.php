<?php

declare(strict_types=1);

namespace App\Tests\Operations;

use App\Email\EmailCrypto;
use App\Email\EmailSender;
use App\Operations\ChainIndex;
use App\Operations\ChainSnapshot;
use App\Operations\ChristmasPostman;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\Lock\Store\FlockStore;

final class ChristmasPostmanTest extends TestCase
{
    public function testRepeatedRunClaimsAndSendsWalletOnlyOnce(): void
    {
        $wallet = '0x'.str_repeat('a', 40);
        $crypto = new EmailCrypto(base64_encode(str_repeat("\x42", 32)), 'lookup_key_for_test_only');
        $encrypted = $crypto->encrypt('user@example.com', $wallet);
        $connection = $this->createMock(Connection::class);
        $connection->method('fetchAssociative')->willReturn([
            'email_ciphertext' => $encrypted->ciphertext,
            'email_iv' => $encrypted->iv,
            'email_tag' => $encrypted->tag,
            'email_lookup_hash' => $encrypted->lookupHash,
        ]);
        $connection->expects(self::exactly(5))->method('executeStatement')->willReturnOnConsecutiveCalls(1, 1, 1, 0, 0);
        $sender = new class implements EmailSender {
            public int $count = 0;
            public function sendVerificationCode(string $email, string $code): void {}
            public function sendChristmasNotification(string $email, int $letterCount, string $idempotencyKey): string
            {
                ++$this->count;
                TestCase::assertSame('gibyeol/christmas-2026/0x'.str_repeat('a', 40), $idempotencyKey);
                TestCase::assertSame(2, $letterCount);
                return 'msg_test';
            }
        };
        $index = new class($wallet) implements ChainIndex {
            public function __construct(private readonly string $wallet) {}
            public function snapshot(): ChainSnapshot { return new ChainSnapshot(100, 90, [$this->wallet => 2], []); }
        };
        $postman = new ChristmasPostman($index, $connection, $crypto, $sender, new LockFactory(new FlockStore(sys_get_temp_dir())), 100);

        self::assertSame(1, $postman->run(101)['sent']);
        self::assertSame(1, $postman->run(101)['skipped']);
        self::assertSame(1, $sender->count);
    }

    public function testRefusesBeforeUnlockWithoutReadingChain(): void
    {
        $index = $this->createMock(ChainIndex::class);
        $index->expects(self::never())->method('snapshot');
        $postman = new ChristmasPostman(
            $index,
            $this->createMock(Connection::class),
            new EmailCrypto(base64_encode(str_repeat("\x42", 32)), 'lookup_key_for_test_only'),
            $this->createMock(EmailSender::class),
            new LockFactory(new FlockStore(sys_get_temp_dir())),
            200,
        );
        $this->expectException(\RuntimeException::class);
        $postman->run(199);
    }
}
