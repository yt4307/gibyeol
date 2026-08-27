<?php

declare(strict_types=1);

namespace App\Controller;

use App\Email\EmailException;
use App\Email\ResendWebhookService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class ResendWebhookController
{
    #[Route('/api/v1/webhooks/resend', name: 'api_v1_webhook_resend', methods: ['POST'])]
    public function __invoke(Request $request, ResendWebhookService $webhook): JsonResponse
    {
        try {
            $processed = $webhook->handle(
                $request->getContent(),
                $request->headers->get('svix-id'),
                $request->headers->get('svix-timestamp'),
                $request->headers->get('svix-signature'),
            );
            return new JsonResponse(['ok' => true, 'duplicate' => !$processed]);
        } catch (EmailException $exception) {
            return new JsonResponse(
                ['error' => ['code' => $exception->errorCode, 'message' => $exception->getMessage()]],
                $exception->status,
            );
        }
    }
}
