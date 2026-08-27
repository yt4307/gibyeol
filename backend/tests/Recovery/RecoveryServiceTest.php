<?php

declare(strict_types=1);

namespace App\Tests\Recovery;

use App\Recovery\MailboxKeyVerifier;
use App\Recovery\RecoveryException;
use App\Recovery\RecoveryService;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;

final class RecoveryServiceTest extends TestCase
{
    public function testRejectsBeforeUnlockWithoutConsultingStorage(): void
    {
        $connection = $this->createMock(Connection::class);
        $connection->expects(self::never())->method('fetchOne');
        $verifier = $this->createMock(MailboxKeyVerifier::class);
        $service = new RecoveryService($connection, $verifier, base64_encode(str_repeat("\x11", 32)), 200);

        $this->expectException(RecoveryException::class);
        $this->expectExceptionMessage('before the unlock time');
        $service->unwrap('0x'.str_repeat('a', 40), 1, 'AA', 'AA', 199);
    }

    public function testUnwrapsOnlySeedMatchingOnChainMailboxKeyAndResealsForClient(): void
    {
        $recoveryKeypair = sodium_crypto_box_seed_keypair(str_repeat("\x11", 32));
        $recoveryPrivateKey = sodium_crypto_box_secretkey($recoveryKeypair);
        $recoveryPublicKey = sodium_crypto_box_publickey($recoveryKeypair);
        $seed = str_repeat("\x22", 32);
        $mailboxKeypair = sodium_crypto_box_seed_keypair($seed);
        $mailboxPublicKey = sodium_crypto_box_publickey($mailboxKeypair);
        $clientKeypair = sodium_crypto_box_seed_keypair(str_repeat("\x33", 32));

        $connection = $this->createMock(Connection::class);
        $connection->method('fetchOne')->willReturn('1');
        $verifier = $this->createMock(MailboxKeyVerifier::class);
        $verifier->method('mailboxPublicKey')->willReturn($mailboxPublicKey);
        $service = new RecoveryService($connection, $verifier, base64_encode($recoveryPrivateKey), 100);

        $sealedSeed = $service->unwrap(
            '0x'.str_repeat('a', 40),
            1,
            $this->encode(sodium_crypto_box_seal($seed, $recoveryPublicKey)),
            $this->encode(sodium_crypto_box_publickey($clientKeypair)),
            101,
        );

        self::assertSame($seed, sodium_crypto_box_seal_open($this->decode($sealedSeed), $clientKeypair));
    }

    private function encode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    private function decode(string $encoded): string
    {
        return (string) base64_decode(strtr($encoded, '-_', '+/').str_repeat('=', (4 - strlen($encoded) % 4) % 4), true);
    }
}
