<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

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
