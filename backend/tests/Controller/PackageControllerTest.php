<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class PackageControllerTest extends WebTestCase
{
    public function testPutRequiresSessionAfterOriginValidation(): void
    {
        $client = self::createClient();
        $client->request(
            'PUT',
            '/api/v1/packages/'.str_repeat('0', 64),
            server: [
                'HTTP_ORIGIN' => 'https://yt4307.github.io',
                'CONTENT_TYPE' => 'application/vnd.gibyeol.package',
                'CONTENT_LENGTH' => '8',
            ],
            content: "GBYL\x01\x00\x00\x00",
        );

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Access-Control-Allow-Origin', 'https://yt4307.github.io');
    }

    public function testMissingAndMalformedPackagesReturnStableErrors(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/v1/packages/'.str_repeat('a', 64));
        self::assertResponseStatusCodeSame(404);
        self::assertJsonStringEqualsJsonString(
            '{"error":{"code":"PACKAGE_NOT_FOUND","message":"Package does not exist."}}',
            (string) $client->getResponse()->getContent(),
        );

        $client->request('HEAD', '/api/v1/packages/INVALID');
        self::assertResponseStatusCodeSame(400);
        self::assertSame('', $client->getResponse()->getContent());
    }
}
