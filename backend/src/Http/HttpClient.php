<?php

declare(strict_types=1);

namespace App\Http;

interface HttpClient
{
    /** @param list<string> $headers */
    public function post(string $url, string $body, array $headers, int $timeoutSeconds): HttpResponse;
}
