<?php

declare(strict_types=1);

namespace App\Tests\Auth;

use App\Auth\SiweMessage;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class SiweMessageTest extends TestCase
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

    public function testCreatesAndParsesStrictEip4361Message(): void
    {
        $message = SiweMessage::create(
            '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
            84532,
            'example.com',
            'https://example.com',
            new \DateTimeImmutable('2026-08-28T00:00:00.000Z'),
            'abcdefgh12345678',
            'Sign in to the Gibyeol 2026 post office.',
            new \DateTimeImmutable('2099-01-01T00:00:00.000Z'),
        );

        self::assertSame(self::MESSAGE, $message);
        $parsed = SiweMessage::parse($message);
        self::assertSame('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', $parsed->address);
        self::assertSame(84532, $parsed->chainId);
        self::assertSame('example.com', $parsed->domain);
        self::assertSame('https://example.com', $parsed->uri);
        self::assertSame('abcdefgh12345678', $parsed->nonce);
    }

    /** @return iterable<string, array{string}> */
    public static function invalidMessages(): iterable
    {
        yield 'trailing data' => [self::MESSAGE."\nResources:"];
        yield 'short nonce' => [str_replace('abcdefgh12345678', 'short', self::MESSAGE)];
        yield 'invalid date' => [str_replace('2026-08-28T00:00:00.000Z', '2026-02-30T00:00:00.000Z', self::MESSAGE)];
        yield 'carriage return' => [str_replace("\nURI:", "\r\nURI:", self::MESSAGE)];
    }

    #[DataProvider('invalidMessages')]
    public function testRejectsMessageOutsideSupportedProfile(string $message): void
    {
        $this->expectException(\InvalidArgumentException::class);
        SiweMessage::parse($message);
    }
}
