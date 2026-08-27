<?php

declare(strict_types=1);

namespace App\Controller;

use App\Email\EmailException;
use App\Email\EmailService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class EmailController
{
    #[Route('/api/v1/mailbox/email/status', name: 'api_v1_email_status', methods: ['GET'])]
    public function status(Request $request, EmailService $email): JsonResponse
    {
        $walletAddress = $request->attributes->get('_wallet_address');
        if (!is_string($walletAddress)) {
            return $this->error('AUTH_REQUIRED', 'A valid session is required.', 401);
        }
        return new JsonResponse(['verified' => $email->isVerified($walletAddress)]);
    }

    #[Route('/api/v1/mailbox/email/challenge', name: 'api_v1_email_challenge', methods: ['POST'])]
    public function challenge(Request $request, EmailService $email): JsonResponse
    {
        $walletAddress = $request->attributes->get('_wallet_address');
        if (!is_string($walletAddress)) {
            return $this->error('AUTH_REQUIRED', 'A valid session is required.', 401);
        }
        try {
            $body = $request->toArray();
            $email->challenge(
                $walletAddress,
                is_string($body['email'] ?? null) ? $body['email'] : '',
                $request->getClientIp() ?? 'unknown',
            );
            return new JsonResponse(['ok' => true, 'message' => 'If the address can receive mail, a verification code was sent.'], 202);
        } catch (EmailException|\InvalidArgumentException|\JsonException $exception) {
            return $this->error(
                $exception instanceof EmailException ? $exception->errorCode : 'EMAIL_INVALID',
                $exception->getMessage(),
                $exception instanceof EmailException ? $exception->status : 400,
            );
        } catch (\RuntimeException) {
            return $this->error('EMAIL_DELIVERY_FAILED', 'Verification email could not be sent.', 503);
        }
    }

    #[Route('/api/v1/mailbox/email/verify', name: 'api_v1_email_verify', methods: ['POST'])]
    public function verify(Request $request, EmailService $email): JsonResponse
    {
        $walletAddress = $request->attributes->get('_wallet_address');
        if (!is_string($walletAddress)) {
            return $this->error('AUTH_REQUIRED', 'A valid session is required.', 401);
        }
        try {
            $body = $request->toArray();
            $email->verify($walletAddress, is_string($body['code'] ?? null) ? $body['code'] : '');
            return new JsonResponse(['ok' => true]);
        } catch (EmailException|\JsonException $exception) {
            return $this->error(
                $exception instanceof EmailException ? $exception->errorCode : 'JSON_INVALID',
                $exception->getMessage(),
                $exception instanceof EmailException ? $exception->status : 400,
            );
        }
    }

    private function error(string $code, string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => ['code' => $code, 'message' => $message]], $status);
    }
}
