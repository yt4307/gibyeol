<?php

declare(strict_types=1);

namespace App\Operations;

final class RpcChainIndex implements ChainIndex
{
    private const LETTER_SEALED_TOPIC = '0x2be88081f72f00781e57de1505090095ec00dc51b664736358f0a3eb16cdc88f';
    private const BLOCK_CHUNK = 10_000;

    public function __construct(
        private readonly string $rpcUrl,
        private readonly string $rpcFallbackUrl,
        private readonly string $contractAddress,
        private readonly int $contractDeploymentBlock,
        private readonly int $safeBlockConfirmations,
    ) {
    }

    public function snapshot(): ChainSnapshot
    {
        foreach (array_values(array_unique(array_filter([$this->rpcUrl, $this->rpcFallbackUrl]))) as $rpcUrl) {
            try {
                return $this->snapshotFrom($rpcUrl);
            } catch (\Throwable) {
                // Try the next configured endpoint without exposing credential-bearing URLs.
            }
        }
        throw new \RuntimeException('Every configured RPC endpoint failed; operation aborted without mutation.');
    }

    private function snapshotFrom(string $rpcUrl): ChainSnapshot
    {
        $headHex = $this->rpc($rpcUrl, 'eth_blockNumber');
        if (!is_string($headHex) || 1 !== preg_match('/^0x[0-9a-f]+$/Di', $headHex)) {
            throw new \RuntimeException('RPC returned an invalid chain head.');
        }
        $head = hexdec($headHex);
        $safe = $head - $this->safeBlockConfirmations;
        if ($safe < $this->contractDeploymentBlock) {
            throw new \RuntimeException('Safe chain head is before the contract deployment block.');
        }
        $counts = [];
        $hashes = [];
        for ($from = $this->contractDeploymentBlock; $from <= $safe; $from += self::BLOCK_CHUNK) {
            $to = min($safe, $from + self::BLOCK_CHUNK - 1);
            $logs = $this->rpc($rpcUrl, 'eth_getLogs', [[
                'address' => strtolower($this->contractAddress),
                'fromBlock' => '0x'.dechex($from),
                'toBlock' => '0x'.dechex($to),
                'topics' => [self::LETTER_SEALED_TOPIC],
            ]]);
            if (!is_array($logs)) {
                throw new \RuntimeException('RPC returned an invalid log page.');
            }
            foreach ($logs as $log) {
                if (!is_array($log) || !is_array($log['topics'] ?? null) || count($log['topics']) !== 4
                    || !is_string($log['topics'][3] ?? null) || !is_string($log['data'] ?? null)
                    || 1 !== preg_match('/^0x[0-9a-f]{128}$/Di', $log['data'])) {
                    throw new \RuntimeException('RPC returned a malformed LetterSealed log.');
                }
                $recipient = '0x'.substr(strtolower($log['topics'][3]), -40);
                $archiveHash = strtolower(substr($log['data'], 66, 64));
                $counts[$recipient] = ($counts[$recipient] ?? 0) + 1;
                $hashes[$archiveHash] = true;
            }
        }
        ksort($counts);
        return new ChainSnapshot($head, $safe, $counts, $hashes);
    }

    /** @param list<mixed> $params */
    private function rpc(string $rpcUrl, string $method, array $params = []): mixed
    {
        $body = json_encode(['jsonrpc' => '2.0', 'id' => 1, 'method' => $method, 'params' => $params], JSON_THROW_ON_ERROR);
        $context = stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $body, 'timeout' => 20, 'ignore_errors' => true]]);
        $response = @file_get_contents($rpcUrl, false, $context);
        if (false === $response) {
            throw new \RuntimeException('RPC request failed; operation aborted without mutation.');
        }
        $decoded = json_decode($response, true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($decoded) || array_key_exists('error', $decoded) || !array_key_exists('result', $decoded)) {
            throw new \RuntimeException('RPC returned an error; operation aborted without mutation.');
        }
        return $decoded['result'];
    }
}
