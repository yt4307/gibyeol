<?php

declare(strict_types=1);

namespace App\Tests\Http;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class CorsSubscriberTest extends WebTestCase
{
    private const WEB_ORIGIN = 'https://yt4307.github.io';

    public function testAllowedOriginReceivesCredentialedCorsHeaders(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/v1/health', server: ['HTTP_ORIGIN' => self::WEB_ORIGIN]);

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Access-Control-Allow-Origin', self::WEB_ORIGIN);
        self::assertResponseHeaderSame('Access-Control-Allow-Credentials', 'true');
        self::assertNotSame('*', $client->getResponse()->headers->get('Access-Control-Allow-Origin'));
        self::assertStringContainsString('Origin', (string) $client->getResponse()->headers->get('Vary'));
    }

    public function testPreflightReturnsNoContentForAllowedOrigin(): void
    {
        $client = self::createClient();
        $client->request('OPTIONS', '/api/v1/session', server: [
            'HTTP_ORIGIN' => self::WEB_ORIGIN,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'Content-Type',
        ]);

        self::assertResponseStatusCodeSame(204);
        self::assertResponseHeaderSame('Access-Control-Allow-Origin', self::WEB_ORIGIN);
        self::assertResponseHeaderSame('Access-Control-Allow-Credentials', 'true');
    }

    public function testDisallowedOriginIsRejectedWithoutCorsHeaders(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/v1/health', server: ['HTTP_ORIGIN' => 'https://evil.example']);

        self::assertResponseStatusCodeSame(403);
        self::assertResponseHeaderNotSame('Access-Control-Allow-Origin', '*');
        self::assertFalse($client->getResponse()->headers->has('Access-Control-Allow-Origin'));
    }

    public function testPreflightWithUnapprovedHeadersIsRejected(): void
    {
        $client = self::createClient();
        $client->request('OPTIONS', '/api/v1/session', server: [
            'HTTP_ORIGIN' => self::WEB_ORIGIN,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'Authorization',
        ]);

        self::assertResponseStatusCodeSame(403);
        self::assertFalse($client->getResponse()->headers->has('Access-Control-Allow-Origin'));
    }

    public function testUnsafeRequestWithoutOriginIsRejected(): void
    {
        $client = self::createClient();
        $client->request('POST', '/api/v1/session');

        self::assertResponseStatusCodeSame(403);
    }
}
