<?php

declare(strict_types=1);

namespace App\Tests\Http;

use App\Http\SessionCookieReader;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class SessionCookieReaderTest extends TestCase
{
    public function testReadsDuplicateSessionCookiesInHeaderOrder(): void
    {
        $first = str_repeat('a', 43);
        $second = str_repeat('b', 43);
        $request = Request::create('/api/v1/auth/session', server: [
            'HTTP_COOKIE' => "sessionid=ignored; gibyeol_session={$first}; gibyeol_session={$second}",
        ]);

        self::assertSame(
            [$first, $second],
            (new SessionCookieReader('gibyeol_session'))->tokens($request),
        );
    }

    public function testIgnoresMalformedTokensAndLimitsCandidates(): void
    {
        $tokens = array_map(
            static fn (string $character): string => str_repeat($character, 43),
            ['a', 'b', 'c', 'd', 'e'],
        );
        $request = Request::create('/api/v1/auth/session', server: [
            'HTTP_COOKIE' => 'gibyeol_session=invalid; '.implode('; ', array_map(
                static fn (string $token): string => "gibyeol_session={$token}",
                $tokens,
            )),
        ]);

        self::assertSame(
            array_slice($tokens, 0, 4),
            (new SessionCookieReader('gibyeol_session'))->tokens($request),
        );
    }
}
