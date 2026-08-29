<?php

declare(strict_types=1);

namespace App\Http;

use App\Auth\AuthService;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class SessionSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly SessionCookieReader $sessionCookieReader,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onKernelRequest', 100]];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api/v1/')) {
            return;
        }
        foreach ($this->sessionCookieReader->tokens($request) as $token) {
            $walletAddress = $this->auth->resolveSession($token);
            if (null !== $walletAddress) {
                $request->attributes->set('_wallet_address', $walletAddress);
                $request->attributes->set('_session_token', $token);
                return;
            }
        }
    }
}
