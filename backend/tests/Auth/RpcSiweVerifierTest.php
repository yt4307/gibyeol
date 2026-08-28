<?php

declare(strict_types=1);

namespace App\Tests\Auth;

use App\Auth\RpcSiweVerifier;
use App\Http\HttpResponse;
use App\Http\JsonRpcClient;
use App\Tests\Support\QueueHttpClient;
use PHPUnit\Framework\TestCase;

final class RpcSiweVerifierTest extends TestCase
{
    private const MESSAGE = "example.com wants you to sign in with your Ethereum account:\n"
        ."0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266\n\n"
        ."Sign in to the Gibyeol 2026 post office.\n\n"
        ."URI: https://example.com\n"
        ."Version: 1\n"
        ."Chain ID: 84532\n"
        ."Nonce: abcdefgh12345678\n"
        ."Issued At: 2026-08-28T00:00:00.000Z\n"
        .'Expiration Time: 2099-01-01T00:00:00.000Z';
    private const SIGNATURE = '0x6159c9358724d687b72d2df9711dd251732980c7d43a2e1a15ded47464df455509d680ff02275d1c82592d0b53a4d6250b6af7aa0a12e170953c76f73c3202b81c';
    private const CALLDATA = '0xa7ebd2a343d8955bf20fc2dace2d1cc800a92e4cbc8392207dbfeaa76ad170b5'
        .'000000000000000000000000000000000000000000000000000000000000001c'
        .'6159c9358724d687b72d2df9711dd251732980c7d43a2e1a15ded47464df4555'
        .'09d680ff02275d1c82592d0b53a4d6250b6af7aa0a12e170953c76f73c3202b8';
    private const RECOVERED = '{"jsonrpc":"2.0","id":1,"result":"0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"}';

    public function testRecoversSignerThroughEvmPrecompile(): void
    {
        $client = new QueueHttpClient([
            $this->rpcResponse('0x14a34'),
            new HttpResponse(200, self::RECOVERED),
        ]);
        $verified = (new RpcSiweVerifier($this->rpcClient($client, 'https://rpc.example')))
            ->verify(self::MESSAGE, self::SIGNATURE);

        self::assertNotNull($verified);
        self::assertSame('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', $verified->address);
        self::assertSame(84532, $verified->chainId);
        $payload = json_decode($client->requests[1]['body'], true, 16, JSON_THROW_ON_ERROR);
        self::assertSame('eth_call', $payload['method']);
        self::assertSame('0x0000000000000000000000000000000000000001', $payload['params'][0]['to']);
        self::assertSame(self::CALLDATA, $payload['params'][0]['data']);
    }

    public function testFallsBackAfterPrimaryRpcFailure(): void
    {
        $client = new QueueHttpClient([
            new HttpResponse(503, ''),
            $this->rpcResponse('0x14a34'),
            new HttpResponse(200, self::RECOVERED),
        ]);
        $verified = (new RpcSiweVerifier($this->rpcClient(
            $client,
            'https://primary.example',
            'https://fallback.example',
        )))
            ->verify(self::MESSAGE, self::SIGNATURE);

        self::assertNotNull($verified);
        self::assertSame('https://primary.example', $client->requests[0]['url']);
        self::assertSame('https://fallback.example', $client->requests[1]['url']);
        self::assertSame('https://fallback.example', $client->requests[2]['url']);
    }

    public function testRejectsMalformedSignatureWithoutRpcRequest(): void
    {
        $client = new QueueHttpClient([]);
        $verified = (new RpcSiweVerifier($this->rpcClient($client, 'https://rpc.example')))
            ->verify(self::MESSAGE, substr(self::SIGNATURE, 0, -2).'00');

        self::assertNull($verified);
        self::assertSame([], $client->requests);
    }

    private function rpcClient(
        QueueHttpClient $client,
        string $primary,
        string $fallback = '',
    ): JsonRpcClient {
        return new JsonRpcClient($client, $primary, $fallback, 84532);
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
