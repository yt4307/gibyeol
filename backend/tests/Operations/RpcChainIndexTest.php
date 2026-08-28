<?php

declare(strict_types=1);

namespace App\Tests\Operations;

use App\Http\HttpResponse;
use App\Http\JsonRpcClient;
use App\Operations\RpcChainIndex;
use App\Tests\Support\QueueHttpClient;
use PHPUnit\Framework\TestCase;

final class RpcChainIndexTest extends TestCase
{
    public function testBuildsSnapshotThroughCurlCompatibleTransport(): void
    {
        $client = new QueueHttpClient([
            $this->rpcResponse('0x14a34'),
            $this->rpcResponse('0x64'),
            $this->rpcResponse([]),
        ]);
        $index = new RpcChainIndex(
            new JsonRpcClient($client, 'https://rpc.example', '', 84532),
            '0x'.str_repeat('a', 40),
            90,
            5,
        );

        $snapshot = $index->snapshot();

        self::assertSame(100, $snapshot->headBlock);
        self::assertSame(95, $snapshot->safeBlock);
        self::assertSame('eth_chainId', json_decode($client->requests[0]['body'], true, 16, JSON_THROW_ON_ERROR)['method']);
        self::assertSame('eth_blockNumber', json_decode($client->requests[1]['body'], true, 16, JSON_THROW_ON_ERROR)['method']);
        self::assertSame('eth_getLogs', json_decode($client->requests[2]['body'], true, 16, JSON_THROW_ON_ERROR)['method']);
        self::assertSame(20, $client->requests[2]['timeout']);
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
