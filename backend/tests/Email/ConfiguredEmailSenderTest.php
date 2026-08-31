<?php

declare(strict_types=1);

namespace App\Tests\Email;

use App\Email\ConfiguredEmailSender;
use App\Email\EmailTemplateRenderer;
use App\Http\HttpResponse;
use App\Tests\Support\QueueHttpClient;
use PHPUnit\Framework\TestCase;

final class ConfiguredEmailSenderTest extends TestCase
{
    public function testSendsResendRequestThroughInjectedHttpClient(): void
    {
        $client = new QueueHttpClient([new HttpResponse(200, '{"id":"email_123"}')]);
        $sender = new ConfiguredEmailSender(
            $client,
            'resend',
            'secret',
            'sender@example.com',
            new EmailTemplateRenderer('https://www.gibyeol.kro.kr', 'https://www.gibyeol.kro.kr'),
        );

        $id = $sender->sendChristmasNotification('user@example.com', 2, 'gibyeol/test');

        self::assertSame('email_123', $id);
        self::assertSame('https://api.resend.com/emails', $client->requests[0]['url']);
        self::assertContains('Authorization: Bearer secret', $client->requests[0]['headers']);
        self::assertContains('Idempotency-Key: gibyeol/test', $client->requests[0]['headers']);
        $message = json_decode($client->requests[0]['body'], true, 16, JSON_THROW_ON_ERROR);
        self::assertSame('user@example.com', $message['to'][0]);
        self::assertSame('12월 25일, 기다리던 기별이 도착했습니다', $message['subject']);
        self::assertStringContainsString('시간을 건너,', $message['html']);
        self::assertStringContainsString('도착한 기별 <strong', $message['html']);
        self::assertStringContainsString('https://www.gibyeol.kro.kr/inbox', $message['html']);
    }

    public function testRejectsUnsuccessfulProviderResponse(): void
    {
        $client = new QueueHttpClient([new HttpResponse(429, '{"message":"rate limited"}')]);
        $sender = new ConfiguredEmailSender(
            $client,
            'resend',
            'secret',
            'sender@example.com',
            new EmailTemplateRenderer('https://www.gibyeol.kro.kr', 'https://www.gibyeol.kro.kr'),
        );

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Email provider request failed.');
        $sender->sendVerificationCode('user@example.com', '123456');
    }
}
