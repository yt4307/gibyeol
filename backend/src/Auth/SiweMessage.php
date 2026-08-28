<?php

declare(strict_types=1);

namespace App\Auth;

final class SiweMessage
{
    private const PATTERN = '/\A'
        .'(?<domain>[A-Za-z0-9.-]{1,253}(?::[0-9]{1,5})?) wants you to sign in with your Ethereum account:\n'
        .'(?<address>0x[0-9A-Fa-f]{40})\n\n'
        .'(?<statement>[^\r\n]{0,512})\n\n'
        .'URI: (?<uri>[^\r\n]{1,2048})\n'
        .'Version: 1\n'
        .'Chain ID: (?<chainId>[1-9][0-9]{0,9})\n'
        .'Nonce: (?<nonce>[A-Za-z0-9]{8,64})\n'
        .'Issued At: (?<issuedAt>[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z)\n'
        .'Expiration Time: (?<expirationTime>[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z)'
        .'\z/D';

    public static function create(
        string $address,
        int $chainId,
        string $domain,
        string $uri,
        \DateTimeInterface $issuedAt,
        string $nonce,
        string $statement,
        \DateTimeInterface $expirationTime,
    ): string {
        $message = $domain." wants you to sign in with your Ethereum account:\n"
            .$address."\n\n"
            .$statement."\n\n"
            .'URI: '.$uri."\n"
            ."Version: 1\n"
            .'Chain ID: '.$chainId."\n"
            .'Nonce: '.$nonce."\n"
            .'Issued At: '.self::formatTime($issuedAt)."\n"
            .'Expiration Time: '.self::formatTime($expirationTime);

        self::parse($message);

        return $message;
    }

    public static function parse(string $message): ParsedSiweMessage
    {
        if (strlen($message) > 4096 || 1 !== preg_match(self::PATTERN, $message, $fields)) {
            throw new \InvalidArgumentException('SIWE message format is invalid.');
        }
        if (str_contains($fields['domain'], '..')
            || str_starts_with($fields['domain'], '.')
            || false === filter_var($fields['uri'], FILTER_VALIDATE_URL)) {
            throw new \InvalidArgumentException('SIWE message origin is invalid.');
        }

        $issuedAt = self::parseTime($fields['issuedAt']);
        $expirationTime = self::parseTime($fields['expirationTime']);
        if ($expirationTime <= $issuedAt) {
            throw new \InvalidArgumentException('SIWE message time range is invalid.');
        }

        return new ParsedSiweMessage(
            strtolower($fields['address']),
            (int) $fields['chainId'],
            $fields['domain'],
            $fields['uri'],
            $fields['nonce'],
            $issuedAt,
            $expirationTime,
        );
    }

    private static function formatTime(\DateTimeInterface $date): string
    {
        return \DateTimeImmutable::createFromInterface($date)
            ->setTimezone(new \DateTimeZone('UTC'))
            ->format('Y-m-d\TH:i:s.v\Z');
    }

    private static function parseTime(string $value): \DateTimeImmutable
    {
        $date = \DateTimeImmutable::createFromFormat(
            '!Y-m-d\TH:i:s.v\Z',
            $value,
            new \DateTimeZone('UTC'),
        );
        if (false === $date || $date->format('Y-m-d\TH:i:s.v\Z') !== $value) {
            throw new \InvalidArgumentException('SIWE message time is invalid.');
        }

        return $date;
    }
}
