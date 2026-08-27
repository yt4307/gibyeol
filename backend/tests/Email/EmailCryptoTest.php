<?php

declare(strict_types=1);

namespace App\Tests\Email;

use App\Email\EmailCrypto;
use PHPUnit\Framework\TestCase;

final class EmailCryptoTest extends TestCase
{
    public function testNormalizesEncryptsAndAuthenticatesWalletContext(): void
    {
        $crypto = new EmailCrypto(base64_encode(str_repeat("\x42", 32)), 'lookup_key_for_test_only');
        $encrypted = $crypto->encrypt(' User@Example.COM ', '0x'.str_repeat('a', 40));

        self::assertSame('user@example.com', $crypto->decrypt($encrypted, '0x'.str_repeat('a', 40)));
        $this->expectException(\RuntimeException::class);
        $crypto->decrypt($encrypted, '0x'.str_repeat('b', 40));
    }

    public function testRejectsInvalidEmail(): void
    {
        $crypto = new EmailCrypto(base64_encode(str_repeat("\x42", 32)), 'lookup_key_for_test_only');
        $this->expectException(\InvalidArgumentException::class);
        $crypto->normalize('not-an-email');
    }
}
