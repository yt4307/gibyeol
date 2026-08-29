<?php

declare(strict_types=1);

namespace App\Http;

use Symfony\Component\HttpFoundation\Request;

final class SessionCookieReader
{
    private const MAX_CANDIDATES = 4;

    public function __construct(private readonly string $sessionCookieName)
    {
    }

    /** @return list<string> */
    public function tokens(Request $request): array
    {
        $tokens = [];
        $rawCookie = $request->server->get('HTTP_COOKIE');
        if (is_string($rawCookie)) {
            foreach (explode(';', $rawCookie) as $part) {
                $pair = explode('=', trim($part), 2);
                if (2 !== count($pair) || rawurldecode($pair[0]) !== $this->sessionCookieName) {
                    continue;
                }
                $this->appendToken($tokens, rawurldecode($pair[1]));
                if (self::MAX_CANDIDATES === count($tokens)) {
                    break;
                }
            }
        }

        $parsedToken = $request->cookies->get($this->sessionCookieName);
        if (is_string($parsedToken) && count($tokens) < self::MAX_CANDIDATES) {
            $this->appendToken($tokens, $parsedToken);
        }

        return $tokens;
    }

    /** @param list<string> $tokens */
    private function appendToken(array &$tokens, string $token): void
    {
        if (1 === preg_match('/^[A-Za-z0-9_-]{43}$/D', $token) && !in_array($token, $tokens, true)) {
            $tokens[] = $token;
        }
    }
}
