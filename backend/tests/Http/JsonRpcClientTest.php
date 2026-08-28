<?php

declare(strict_types=1);

namespace App\Tests\Http;

use App\Http\HttpResponse;
use App\Http\JsonRpcClient;
use App\Tests\Support\QueueHttpClient;
use PHPUnit\Framework\TestCase;

final class JsonRpcClientTest extends TestCase
{
    public function testUsesFallbackWhenPrimaryIsOnUnexpectedChain(): void
    {
        $http = new QueueHttpClient([
            $this->rpcResponse('0x1'),
            $this->rpcResponse('0x14a34'),
            $this->rpcResponse('0x42'),
        ]);
        $client = new JsonRpcClient(
            $http,
            'https://primary.example',
            'https://fallback.example',
            84532,
        );

        self::assertSame('0x42', $client->requestConsistent('eth_blockNumber'));
        self::assertSame('https://primary.example', $http->requests[0]['url']);
        self::assertSame('https://fallback.example', $http->requests[1]['url']);
        self::assertSame('https://fallback.example', $http->requests[2]['url']);
    }

    public function testRejectsInconsistentResultsFromHealthyEndpoints(): void
    {
        $http = new QueueHttpClient([
            $this->rpcResponse('0x14a34'),
            $this->rpcResponse('0xaa'),
            $this->rpcResponse('0x14a34'),
            $this->rpcResponse('0xbb'),
        ]);
        $client = new JsonRpcClient(
            $http,
            'https://primary.example',
            'https://fallback.example',
            84532,
        );

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('inconsistent results');
        $client->requestConsistent('eth_call');
    }

    public function testRejectsMismatchedResponseId(): void
    {
        $http = new QueueHttpClient([new HttpResponse(200, json_encode([
            'jsonrpc' => '2.0',
            'id' => 2,
            'result' => '0x14a34',
        ], JSON_THROW_ON_ERROR))]);
        $client = new JsonRpcClient($http, 'https://rpc.example', '', 84532);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Every configured RPC endpoint failed.');
        $client->requestConsistent('eth_call');
    }

    private function rpcResponse(mixed $result): HttpResponse
    {
        return new HttpResponse(200, json_encode([
            'jsonrpc' => '2.0',
            'id' => 1,
            'result' => $result,
        ], JSON_THROW_ON_ERROR));
    }
}
