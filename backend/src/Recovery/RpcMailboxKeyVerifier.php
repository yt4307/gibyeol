<?php

declare(strict_types=1);

namespace App\Recovery;

use App\Http\JsonRpcClient;

final class RpcMailboxKeyVerifier implements MailboxKeyVerifier
{
    private const SELECTOR = '3b590df3';

    public function __construct(
        private readonly JsonRpcClient $rpcClient,
        private readonly string $contractAddress,
    ) {
    }

    public function mailboxPublicKey(string $walletAddress, int $keyId): string
    {
        if (1 !== preg_match('/^0x[0-9a-fA-F]{40}$/D', $walletAddress)
            || 1 !== preg_match('/^0x[0-9a-fA-F]{40}$/D', $this->contractAddress)
            || $keyId < 1 || $keyId > 0xFFFFFFFF) {
            throw new \RuntimeException('Mailbox lookup configuration is invalid.');
        }
        $data = '0x'.self::SELECTOR
            .str_pad(substr(strtolower($walletAddress), 2), 64, '0', STR_PAD_LEFT)
            .str_pad(dechex($keyId), 64, '0', STR_PAD_LEFT);
        try {
            $hex = $this->rpcClient->requestConsistent('eth_call', [[
                'to' => strtolower($this->contractAddress),
                'data' => $data,
            ], 'latest']);
        } catch (\Throwable $exception) {
            throw new \RuntimeException('Mailbox lookup failed.', previous: $exception);
        }
        if (!is_string($hex) || 1 !== preg_match('/^0x[0-9a-fA-F]{64}$/D', $hex)) {
            throw new \RuntimeException('Mailbox lookup returned an invalid response.');
        }
        $key = hex2bin(substr($hex, 2));
        if (false === $key) {
            throw new \RuntimeException('Mailbox lookup returned an invalid key.');
        }
        return $key;
    }
}
