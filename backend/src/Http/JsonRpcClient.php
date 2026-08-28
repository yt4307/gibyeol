<?php

declare(strict_types=1);

namespace App\Http;

final class JsonRpcClient
{
    /** @var array<string, true> */
    private array $validatedEndpoints = [];

    public function __construct(
        private readonly HttpClient $httpClient,
        private readonly string $rpcUrl,
        private readonly string $rpcFallbackUrl,
        private readonly int $chainId,
    ) {
    }

    /** @return list<string> */
    public function endpoints(): array
    {
        $endpoints = array_values(array_unique(array_filter([$this->rpcUrl, $this->rpcFallbackUrl])));
        if ([] === $endpoints) {
            throw new \RuntimeException('No RPC endpoint is configured.');
        }

        return $endpoints;
    }

    /** @param list<mixed> $params */
    public function requestFrom(string $rpcUrl, string $method, array $params = [], int $timeoutSeconds = 10): mixed
    {
        if (!in_array($rpcUrl, $this->endpoints(), true)) {
            throw new \RuntimeException('RPC endpoint is not configured.');
        }
        $this->assertChainId($rpcUrl, $timeoutSeconds);

        return $this->request($rpcUrl, $method, $params, $timeoutSeconds);
    }

    /** @param list<mixed> $params */
    public function requestConsistent(string $method, array $params = [], int $timeoutSeconds = 10): mixed
    {
        $results = [];
        foreach ($this->endpoints() as $rpcUrl) {
            try {
                $results[] = $this->requestFrom($rpcUrl, $method, $params, $timeoutSeconds);
            } catch (\Throwable) {
                // A failed endpoint does not prevent a configured healthy fallback from answering.
            }
        }
        if ([] === $results) {
            throw new \RuntimeException('Every configured RPC endpoint failed.');
        }

        $expected = $this->canonical($results[0]);
        foreach (array_slice($results, 1) as $result) {
            if ($expected !== $this->canonical($result)) {
                throw new \RuntimeException('Configured RPC endpoints returned inconsistent results.');
            }
        }

        return $results[0];
    }

    private function assertChainId(string $rpcUrl, int $timeoutSeconds): void
    {
        if (isset($this->validatedEndpoints[$rpcUrl])) {
            return;
        }
        $result = $this->request($rpcUrl, 'eth_chainId', [], min(5, $timeoutSeconds));
        if (!is_string($result) || 1 !== preg_match('/^0x[0-9a-f]+$/Di', $result)
            || hexdec($result) !== $this->chainId) {
            throw new \RuntimeException('RPC endpoint is connected to an unexpected chain.');
        }
        $this->validatedEndpoints[$rpcUrl] = true;
    }

    /** @param list<mixed> $params */
    private function request(string $rpcUrl, string $method, array $params, int $timeoutSeconds): mixed
    {
        if (1 !== preg_match('/^eth_[A-Za-z0-9]+$/D', $method)) {
            throw new \InvalidArgumentException('JSON-RPC method is invalid.');
        }
        $body = json_encode([
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => $method,
            'params' => $params,
        ], JSON_THROW_ON_ERROR);
        $response = $this->httpClient->post(
            $rpcUrl,
            $body,
            ['Content-Type: application/json'],
            $timeoutSeconds,
        );
        if (!$response->isSuccessful()) {
            throw new \RuntimeException('RPC request failed.');
        }
        $decoded = json_decode($response->body, true, 64, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)
            || '2.0' !== ($decoded['jsonrpc'] ?? null)
            || 1 !== ($decoded['id'] ?? null)
            || array_key_exists('error', $decoded)
            || !array_key_exists('result', $decoded)) {
            throw new \RuntimeException('RPC returned an invalid response envelope.');
        }

        return $decoded['result'];
    }

    private function canonical(mixed $value): string
    {
        return json_encode($this->normalize($value), JSON_THROW_ON_ERROR);
    }

    private function normalize(mixed $value): mixed
    {
        if (is_string($value) && 1 === preg_match('/^0x[0-9a-f]*$/Di', $value)) {
            return strtolower($value);
        }
        if (!is_array($value)) {
            return $value;
        }
        if (!array_is_list($value)) {
            ksort($value);
        }
        foreach ($value as $key => $item) {
            $value[$key] = $this->normalize($item);
        }

        return $value;
    }
}
