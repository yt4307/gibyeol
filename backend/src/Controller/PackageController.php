<?php

declare(strict_types=1);

namespace App\Controller;

use App\Package\PackageException;
use App\Package\PackageStore;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PackageController
{
    #[Route('/api/v1/packages/{sha256}', name: 'api_v1_package_put', methods: ['PUT'])]
    public function put(string $sha256, Request $request, PackageStore $store): JsonResponse
    {
        if (!is_string($request->attributes->get('_wallet_address'))) {
            return $this->error('UNAUTHORIZED', 'SIWE session is required.', Response::HTTP_UNAUTHORIZED);
        }
        if (PackageStore::MEDIA_TYPE !== $request->headers->get('Content-Type')) {
            return $this->error('PACKAGE_CONTENT_TYPE_INVALID', 'Unexpected package Content-Type.', 415);
        }
        $length = $request->headers->get('Content-Length');
        if (null === $length || !ctype_digit($length)) {
            return $this->error('PACKAGE_LENGTH_REQUIRED', 'A valid Content-Length is required.', 411);
        }

        try {
            $result = $store->put($sha256, $request->getContent(true), (int) $length);
            return new JsonResponse($result, $result['created'] ? 201 : 200);
        } catch (PackageException $exception) {
            return $this->error($exception->errorCode, $exception->getMessage(), $exception->status);
        }
    }

    #[Route('/api/v1/packages/{sha256}', name: 'api_v1_package_get', methods: ['GET', 'HEAD'])]
    public function get(string $sha256, Request $request, PackageStore $store): Response
    {
        try {
            $path = $store->find($sha256);
        } catch (PackageException $exception) {
            return $this->error($exception->errorCode, $exception->getMessage(), $exception->status);
        }
        if (null === $path) {
            return $this->error('PACKAGE_NOT_FOUND', 'Package does not exist.', 404);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', PackageStore::MEDIA_TYPE);
        $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->setEtag($sha256);
        $response->isNotModified($request);
        return $response;
    }

    private function error(string $code, string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => ['code' => $code, 'message' => $message]], $status);
    }
}
