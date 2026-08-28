<?php

declare(strict_types=1);

namespace App\Http;

final class CurlHttpClient implements HttpClient
{
    public function post(string $url, string $body, array $headers, int $timeoutSeconds): HttpResponse
    {
        if ($timeoutSeconds < 1 || !in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true)) {
            throw new \InvalidArgumentException('Outbound HTTP request configuration is invalid.');
        }

        $handle = curl_init();
        try {
            if (!curl_setopt_array($handle, [
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $body,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_CONNECTTIMEOUT => $timeoutSeconds,
                CURLOPT_TIMEOUT => $timeoutSeconds,
                CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            ])) {
                throw new \RuntimeException('Outbound HTTP request setup failed.');
            }

            $responseBody = curl_exec($handle);
            if (!is_string($responseBody)) {
                throw new \RuntimeException('Outbound HTTP request failed.');
            }

            return new HttpResponse((int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE), $responseBody);
        } finally {
            curl_close($handle);
        }
    }
}
