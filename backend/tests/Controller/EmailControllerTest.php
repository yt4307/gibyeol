<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class EmailControllerTest extends WebTestCase
{
    public function testEmailEndpointsRequireSession(): void
    {
        $client = self::createClient();
        $client->jsonRequest('POST', '/api/v1/mailbox/email/challenge', ['email' => 'user@example.com'], [
            'HTTP_ORIGIN' => 'https://yt4307.github.io',
        ]);
        self::assertResponseStatusCodeSame(401);

        $client->jsonRequest('POST', '/api/v1/mailbox/email/verify', ['code' => '123456'], [
            'HTTP_ORIGIN' => 'https://yt4307.github.io',
        ]);
        self::assertResponseStatusCodeSame(401);
    }

    public function testRecoveryEndpointRequiresSession(): void
    {
        $client = self::createClient();
        $client->jsonRequest('POST', '/api/v1/recovery/unwrap', [], [
            'HTTP_ORIGIN' => 'https://yt4307.github.io',
        ]);
        self::assertResponseStatusCodeSame(401);
    }
}
