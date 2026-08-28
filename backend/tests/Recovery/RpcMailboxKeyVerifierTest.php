<?php

declare(strict_types=1);

namespace App\Tests\Recovery;

use App\Http\HttpResponse;
use App\Recovery\RpcMailboxKeyVerifier;
use App\Tests\Support\QueueHttpClient;
use PHPUnit\Framework\TestCase;

final class RpcMailboxKeyVerifierTest extends TestCase
{
    public function testReadsMailboxKeyThroughCurlCompatibleTransport(): void
    {
        $expectedKey = str_repeat("\x42", 32);
        $client = new QueueHttpClient([new HttpResponse(200, json_encode([
            'jsonrpc' => '2.0',
            'id' => 1,
            'result' => '0x'.bin2hex($expectedKey),
        ], JSON_THROW_ON_ERROR))]);
        $verifier = new RpcMailboxKeyVerifier(
            $client,
            'https://rpc.example',
            '0x'.str_repeat('a', 40),
        );

        self::assertSame($expectedKey, $verifier->mailboxPublicKey('0x'.str_repeat('b', 40), 7));
        self::assertSame('https://rpc.example', $client->requests[0]['url']);
        self::assertSame('eth_call', json_decode($client->requests[0]['body'], true, 16, JSON_THROW_ON_ERROR)['method']);
        self::assertSame(10, $client->requests[0]['timeout']);
    }

    public function testRejectsUnsuccessfulRpcResponse(): void
    {
        $client = new QueueHttpClient([new HttpResponse(503, '')]);
        $verifier = new RpcMailboxKeyVerifier(
            $client,
            'https://rpc.example',
            '0x'.str_repeat('a', 40),
        );

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Mailbox lookup failed.');
        $verifier->mailboxPublicKey('0x'.str_repeat('b', 40), 7);
    }
}
