<?php

declare(strict_types=1);

namespace App\Controller;

use App\Recovery\RecoveryException;
use App\Recovery\RecoveryService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class RecoveryController
{
    #[Route('/api/v1/recovery/unwrap', name: 'api_v1_recovery_unwrap', methods: ['POST'])]
    public function unwrap(Request $request, RecoveryService $recovery): JsonResponse
    {
        $walletAddress = $request->attributes->get('_wallet_address');
        if (!is_string($walletAddress)) {
            return $this->error('AUTH_REQUIRED', 'A valid session is required.', 401);
        }
        try {
            $body = $request->toArray();
            $sealedSeed = $recovery->unwrap(
                $walletAddress,
                is_int($body['keyId'] ?? null) ? $body['keyId'] : 0,
                is_string($body['recoveryCiphertext'] ?? null) ? $body['recoveryCiphertext'] : '',
                is_string($body['clientPublicKey'] ?? null) ? $body['clientPublicKey'] : '',
            );
            return new JsonResponse(['sealedSeed' => $sealedSeed]);
        } catch (RecoveryException|\JsonException $exception) {
            return $this->error(
                $exception instanceof RecoveryException ? $exception->errorCode : 'JSON_INVALID',
                $exception->getMessage(),
                $exception instanceof RecoveryException ? $exception->status : 400,
            );
        } catch (\Throwable) {
            return $this->error('RECOVERY_UNAVAILABLE', 'Recovery is temporarily unavailable.', 503);
        }
    }

    private function error(string $code, string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => ['code' => $code, 'message' => $message]], $status);
    }
}
