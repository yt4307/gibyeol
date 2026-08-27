<?php

declare(strict_types=1);

namespace App\Tests\Email;

use App\Email\EmailException;
use App\Email\ResendWebhookVerifier;
use PHPUnit\Framework\TestCase;

final class ResendWebhookVerifierTest extends TestCase
{
    private const SECRET_BYTES = '0123456789abcdef0123456789abcdef';

    public function testVerifiesRawBodyAndSvixHeaders(): void
    {
        $body = '{"type":"email.delivered","data":{"email_id":"msg_123"}}';
        $id = 'evt_123';
        $timestamp = '1790000000';
        $signature = 'v1,'.base64_encode(hash_hmac(
            'sha256',
            $id.'.'.$timestamp.'.'.$body,
            self::SECRET_BYTES,
            true,
        ));
        $verifier = new ResendWebhookVerifier('whsec_'.base64_encode(self::SECRET_BYTES));

        $verified = $verifier->verify($body, $id, $timestamp, $signature, 1_790_000_001);

        self::assertSame($id, $verified->eventId);
        self::assertSame('email.delivered', $verified->payload['type']);
    }

    public function testRejectsStaleOrTamperedRequest(): void
    {
        $verifier = new ResendWebhookVerifier('whsec_'.base64_encode(self::SECRET_BYTES));
        $this->expectException(EmailException::class);
        $verifier->verify('{}', 'evt_123', '1790000000', 'v1,invalid', 1_790_000_301);
    }
}
