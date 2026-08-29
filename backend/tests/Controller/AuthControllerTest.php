<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\BrowserKit\Cookie;

final class AuthControllerTest extends WebTestCase
{
    private const ORIGIN = 'https://yt4307.github.io';

    public function testChallengeRejectsMalformedAddressBeforeStorage(): void
    {
        $client = self::createClient();
        $client->jsonRequest('POST', '/api/v1/auth/challenge', [
            'walletAddress' => 'invalid',
            'chainId' => 84532,
        ], server: ['HTTP_ORIGIN' => self::ORIGIN]);

        self::assertResponseStatusCodeSame(400);
        self::assertStringContainsString('WALLET_ADDRESS_INVALID', (string) $client->getResponse()->getContent());
    }

    public function testVerifyRejectsInvalidSignatureBeforeNonceLookup(): void
    {
        $client = self::createClient();
        $client->jsonRequest('POST', '/api/v1/auth/verify', [
            'message' => 'invalid',
            'signature' => '0x00',
        ], server: ['HTTP_ORIGIN' => self::ORIGIN]);

        self::assertResponseStatusCodeSame(401);
        self::assertStringContainsString('SIWE_INVALID', (string) $client->getResponse()->getContent());
    }

    public function testSessionRejectsMissingCookie(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/v1/auth/session', server: ['HTTP_ORIGIN' => self::ORIGIN]);

        self::assertResponseStatusCodeSame(401);
        self::assertStringContainsString('AUTH_REQUIRED', (string) $client->getResponse()->getContent());
    }

    public function testSessionRestoresAuthenticatedWallet(): void
    {
        $client = self::createClient();
        $token = str_repeat('a', 43);
        $walletAddress = '0x1111111111111111111111111111111111111111';
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);
        $connection->delete('sessions', ['token_hash' => hash('sha256', $token, true)]);
        $connection->insert('sessions', [
            'token_hash' => hash('sha256', $token, true),
            'wallet_address' => $walletAddress,
            'expires_at' => '2099-12-31 23:59:59.000000',
            'created_at' => '2026-08-29 00:00:00.000000',
            'last_seen_at' => '2026-08-29 00:00:00.000000',
        ]);
        $client->getCookieJar()->set(new Cookie('gibyeol_session', $token, null, '/', '', false, true));

        try {
            $client->request('GET', '/api/v1/auth/session', server: ['HTTP_ORIGIN' => self::ORIGIN]);

            self::assertResponseIsSuccessful();
            self::assertJsonStringEqualsJsonString(
                json_encode(['walletAddress' => $walletAddress], JSON_THROW_ON_ERROR),
                (string) $client->getResponse()->getContent(),
            );
        } finally {
            $connection->delete('sessions', ['token_hash' => hash('sha256', $token, true)]);
        }
    }

    public function testSessionRestoresFromValidDuplicateCookie(): void
    {
        $client = self::createClient();
        $expiredToken = str_repeat('a', 43);
        $validToken = str_repeat('b', 43);
        $walletAddress = '0x2222222222222222222222222222222222222222';
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);
        $connection->delete('sessions', ['token_hash' => hash('sha256', $validToken, true)]);
        $connection->insert('sessions', [
            'token_hash' => hash('sha256', $validToken, true),
            'wallet_address' => $walletAddress,
            'expires_at' => '2099-12-31 23:59:59.000000',
            'created_at' => '2026-08-29 00:00:00.000000',
            'last_seen_at' => '2026-08-29 00:00:00.000000',
        ]);

        try {
            $client->request('GET', '/api/v1/auth/session', server: [
                'HTTP_ORIGIN' => self::ORIGIN,
                'HTTP_COOKIE' => "gibyeol_session={$expiredToken}; gibyeol_session={$validToken}",
            ]);

            self::assertResponseIsSuccessful();
            self::assertJsonStringEqualsJsonString(
                json_encode(['walletAddress' => $walletAddress], JSON_THROW_ON_ERROR),
                (string) $client->getResponse()->getContent(),
            );
        } finally {
            $connection->delete('sessions', ['token_hash' => hash('sha256', $validToken, true)]);
        }
    }

    public function testLogoutDeletesTheValidDuplicateSession(): void
    {
        $client = self::createClient();
        $expiredToken = str_repeat('a', 43);
        $validToken = str_repeat('c', 43);
        $connection = self::getContainer()->get(Connection::class);
        self::assertInstanceOf(Connection::class, $connection);
        $connection->delete('sessions', ['token_hash' => hash('sha256', $validToken, true)]);
        $connection->insert('sessions', [
            'token_hash' => hash('sha256', $validToken, true),
            'wallet_address' => '0x3333333333333333333333333333333333333333',
            'expires_at' => '2099-12-31 23:59:59.000000',
            'created_at' => '2026-08-29 00:00:00.000000',
            'last_seen_at' => '2026-08-29 00:00:00.000000',
        ]);

        $client->request('POST', '/api/v1/auth/logout', server: [
            'HTTP_ORIGIN' => self::ORIGIN,
            'HTTP_COOKIE' => "gibyeol_session={$expiredToken}; gibyeol_session={$validToken}",
        ]);

        self::assertResponseIsSuccessful();
        self::assertFalse($connection->fetchOne(
            'SELECT 1 FROM sessions WHERE token_hash = ?',
            [hash('sha256', $validToken, true)],
        ));
    }

    public function testChallengeRateLimitRejectsEleventhRequestFromSameClient(): void
    {
        $client = self::createClient();
        for ($attempt = 1; $attempt <= 11; ++$attempt) {
            $client->jsonRequest('POST', '/api/v1/auth/challenge', [
                'walletAddress' => 'invalid',
                'chainId' => 84532,
            ], server: [
                'HTTP_ORIGIN' => self::ORIGIN,
                'REMOTE_ADDR' => '192.0.2.10',
            ]);
        }

        self::assertResponseStatusCodeSame(429);
        self::assertStringContainsString('AUTH_RATE_LIMITED', (string) $client->getResponse()->getContent());
        self::assertNotNull($client->getResponse()->headers->get('Retry-After'));
    }

    public function testVerifyRateLimitRejectsEleventhRequestFromSameClient(): void
    {
        $client = self::createClient();
        for ($attempt = 1; $attempt <= 11; ++$attempt) {
            $client->jsonRequest('POST', '/api/v1/auth/verify', [
                'message' => 'invalid',
                'signature' => '0x00',
            ], server: [
                'HTTP_ORIGIN' => self::ORIGIN,
                'REMOTE_ADDR' => '192.0.2.11',
            ]);
        }

        self::assertResponseStatusCodeSame(429);
        self::assertStringContainsString('AUTH_RATE_LIMITED', (string) $client->getResponse()->getContent());
        self::assertNotNull($client->getResponse()->headers->get('Retry-After'));
    }
}
