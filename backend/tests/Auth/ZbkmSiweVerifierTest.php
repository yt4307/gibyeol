<?php

declare(strict_types=1);

namespace App\Tests\Auth;

use App\Auth\ZbkmSiweVerifier;
use PHPUnit\Framework\TestCase;

final class ZbkmSiweVerifierTest extends TestCase
{
    private const MESSAGE = "example.com wants you to sign in with your Ethereum account:\n"
        ."0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266\n\n"
        ."Sign in to the Gibyeol 2026 post office.\n\n"
        ."URI: https://example.com\n"
        ."Version: 1\n"
        ."Chain ID: 84532\n"
        ."Nonce: abcdefgh12345678\n"
        ."Issued At: 2026-08-28T00:00:00.000Z\n"
        .'Expiration Time: 2099-01-01T00:00:00.000Z';

    private const SIGNATURE = '0x6159c9358724d687b72d2df9711dd251732980c7d43a2e1a15ded47464df455509d680ff02275d1c82592d0b53a4d6250b6af7aa0a12e170953c76f73c3202b81c';

    public function testVerifiesEip4361SignatureAndReturnsBoundFields(): void
    {
        $verified = (new ZbkmSiweVerifier())->verify(self::MESSAGE, self::SIGNATURE);

        self::assertNotNull($verified);
        self::assertSame('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', $verified->address);
        self::assertSame(84532, $verified->chainId);
        self::assertSame('example.com', $verified->domain);
        self::assertSame('https://example.com', $verified->uri);
        self::assertSame('abcdefgh12345678', $verified->nonce);
    }

    public function testRejectsTamperedMessageAndSignature(): void
    {
        $verifier = new ZbkmSiweVerifier();
        self::assertNull($verifier->verify(str_replace('84532', '8453', self::MESSAGE), self::SIGNATURE));
        self::assertNull($verifier->verify(self::MESSAGE, substr(self::SIGNATURE, 0, -2).'00'));
    }
}
