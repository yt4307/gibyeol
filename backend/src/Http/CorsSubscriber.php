<?php

declare(strict_types=1);

namespace App\Http;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class CorsSubscriber implements EventSubscriberInterface
{
    private const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    private const ALLOWED_HEADERS = ['content-type', 'x-requested-with'];

    public function __construct(private readonly string $webOrigin)
    {
        $parts = parse_url($webOrigin);
        $expected = is_array($parts) && isset($parts['scheme'], $parts['host'])
            ? $parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : '')
            : null;

        if (!in_array($parts['scheme'] ?? null, ['http', 'https'], true) || $expected !== $webOrigin) {
            throw new \InvalidArgumentException('WEB_ORIGIN must be one exact origin without a trailing slash.');
        }
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 250],
            KernelEvents::RESPONSE => ['onKernelResponse', -250],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();

        if (!$this->isApiRequest($request)) {
            return;
        }

        $origin = $request->headers->get('Origin');
        if (null !== $origin && !hash_equals($this->webOrigin, $origin)) {
            $event->setResponse($this->forbidden());

            return;
        }

        if ($this->requiresOrigin($request) && null === $origin) {
            $event->setResponse($this->forbidden());

            return;
        }

        if ($request->isMethod('OPTIONS')) {
            if (null === $origin || !$this->isAllowedPreflight($request)) {
                $event->setResponse($this->forbidden());

                return;
            }

            $event->setResponse(new Response(status: Response::HTTP_NO_CONTENT));
        }

        if (null !== $origin) {
            $request->attributes->set('_gibyeol_cors_origin', $origin);
        }
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        $origin = $request->attributes->get('_gibyeol_cors_origin');

        if (!is_string($origin)) {
            return;
        }

        $headers = $event->getResponse()->headers;
        $headers->set('Access-Control-Allow-Origin', $origin);
        $headers->set('Access-Control-Allow-Credentials', 'true');
        $headers->set('Access-Control-Allow-Methods', implode(', ', self::ALLOWED_METHODS));
        $headers->set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
        $headers->set('Access-Control-Max-Age', '600');
        $event->getResponse()->setVary('Origin', false);
    }

    private function isApiRequest(Request $request): bool
    {
        return str_starts_with($request->getPathInfo(), '/api/v1/');
    }

    private function requiresOrigin(Request $request): bool
    {
        if (in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return false;
        }

        return !str_starts_with($request->getPathInfo(), '/api/v1/webhooks/');
    }

    private function isAllowedPreflight(Request $request): bool
    {
        $method = strtoupper((string) $request->headers->get('Access-Control-Request-Method'));
        if (!in_array($method, self::ALLOWED_METHODS, true)) {
            return false;
        }

        $requestedHeaders = array_filter(array_map(
            static fn (string $header): string => strtolower(trim($header)),
            explode(',', (string) $request->headers->get('Access-Control-Request-Headers')),
        ));

        return [] === array_diff($requestedHeaders, self::ALLOWED_HEADERS);
    }

    private function forbidden(): JsonResponse
    {
        return new JsonResponse(
            ['error' => ['code' => 'origin_not_allowed', 'message' => 'Origin is not allowed.']],
            Response::HTTP_FORBIDDEN,
        );
    }
}
