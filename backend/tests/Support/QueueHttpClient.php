<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Http\HttpClient;
use App\Http\HttpResponse;

final class QueueHttpClient implements HttpClient
{
    /** @var list<array{url: string, body: string, headers: list<string>, timeout: int}> */
    public array $requests = [];

    /** @param list<HttpResponse> $responses */
    public function __construct(private array $responses)
    {
    }

    public function post(string $url, string $body, array $headers, int $timeoutSeconds): HttpResponse
    {
        $this->requests[] = [
            'url' => $url,
            'body' => $body,
            'headers' => $headers,
            'timeout' => $timeoutSeconds,
        ];

        return array_shift($this->responses)
            ?? throw new \RuntimeException('Unexpected outbound HTTP request in test.');
    }
}
