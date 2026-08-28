<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthException;
use App\Auth\AuthRequestLimiter;
use App\Auth\AuthService;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimit;
use Symfony\Component\Routing\Attribute\Route;

final class AuthController
{
    public function __construct(
        private readonly string $sessionCookieName,
        private readonly string $sessionSameSite,
        private readonly AuthRequestLimiter $requestLimiter,
    ) {
    }

    #[Route('/api/v1/auth/challenge', name: 'api_v1_auth_challenge', methods: ['POST'])]
    public function challenge(Request $request, AuthService $auth): JsonResponse
    {
        if (null !== $limited = $this->rateLimited($this->requestLimiter->consumeChallenge($request))) {
            return $limited;
        }

        try {
            $body = $request->toArray();
            return new JsonResponse($auth->challenge(
                is_string($body['walletAddress'] ?? null) ? $body['walletAddress'] : '',
                is_int($body['chainId'] ?? null) ? $body['chainId'] : 0,
            ));
        } catch (AuthException|\JsonException $exception) {
            return $this->error(
                $exception instanceof AuthException ? $exception->errorCode : 'JSON_INVALID',
                $exception->getMessage(),
                400,
            );
        }
    }

    #[Route('/api/v1/auth/verify', name: 'api_v1_auth_verify', methods: ['POST'])]
    public function verify(Request $request, AuthService $auth): JsonResponse
    {
        if (null !== $limited = $this->rateLimited($this->requestLimiter->consumeVerify($request))) {
            return $limited;
        }

        try {
            $body = $request->toArray();
            $result = $auth->verify(
                is_string($body['message'] ?? null) ? $body['message'] : '',
                is_string($body['signature'] ?? null) ? $body['signature'] : '',
            );
            $response = new JsonResponse(['walletAddress' => $result['walletAddress']]);
            $response->headers->setCookie($this->sessionCookie($result['token'], $result['expiresAt']));
            return $response;
        } catch (AuthException|\JsonException $exception) {
            return $this->error(
                $exception instanceof AuthException ? $exception->errorCode : 'JSON_INVALID',
                $exception->getMessage(),
                401,
            );
        }
    }

    #[Route('/api/v1/auth/logout', name: 'api_v1_auth_logout', methods: ['POST'])]
    public function logout(Request $request, AuthService $auth): JsonResponse
    {
        $token = $request->cookies->get($this->sessionCookieName);
        $auth->logout(is_string($token) ? $token : null);
        $response = new JsonResponse(['ok' => true]);
        $response->headers->clearCookie(
            $this->sessionCookieName,
            '/',
            null,
            true,
            true,
            $this->sessionSameSite,
        );
        return $response;
    }

    private function sessionCookie(string $token, \DateTimeImmutable $expiresAt): Cookie
    {
        return Cookie::create($this->sessionCookieName)
            ->withValue($token)
            ->withExpires($expiresAt)
            ->withPath('/')
            ->withSecure(true)
            ->withHttpOnly(true)
            ->withSameSite($this->sessionSameSite);
    }

    private function error(string $code, string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => ['code' => $code, 'message' => $message]], $status);
    }

    private function rateLimited(RateLimit $limit): ?JsonResponse
    {
        if ($limit->isAccepted()) {
            return null;
        }

        $response = $this->error('AUTH_RATE_LIMITED', 'Too many authentication requests.', 429);
        $retryAfter = max(1, $limit->getRetryAfter()->getTimestamp() - time());
        $response->headers->set('Retry-After', (string) $retryAfter);

        return $response;
    }
}
