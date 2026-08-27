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
        private readonly string $sessionCookieName,
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
        $token = $request->cookies->get($this->sessionCookieName);
        if (!is_string($token)) {
            return;
        }
        $walletAddress = $this->auth->resolveSession($token);
        if (null !== $walletAddress) {
            $request->attributes->set('_wallet_address', $walletAddress);
        }
    }
}
