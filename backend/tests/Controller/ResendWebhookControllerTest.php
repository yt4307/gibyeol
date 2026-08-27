<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ResendWebhookControllerTest extends WebTestCase
{
    public function testRejectsUnsignedWebhookWithoutBrowserOrigin(): void
    {
        $client = self::createClient();
        $client->request(
            'POST',
            '/api/v1/webhooks/resend',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: '{}',
        );

        self::assertResponseStatusCodeSame(401);
        self::assertJsonStringEqualsJsonString(
            '{"error":{"code":"WEBHOOK_SIGNATURE_INVALID","message":"Webhook signature is invalid."}}',
            (string) $client->getResponse()->getContent(),
        );
    }
}
