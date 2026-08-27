<?php

declare(strict_types=1);

namespace App\Package;

final class PackageStore
{
    public const MAX_BYTES = 10_485_760;
    public const MEDIA_TYPE = 'application/vnd.gibyeol.package';

    public function __construct(
        private readonly string $packageStoragePath,
        private readonly GbylValidator $validator,
    ) {
    }

    /** @param resource $input @return array{sha256: string, size: int, created: bool} */
    public function put(string $sha256, $input, int $contentLength): array
    {
        $this->assertDigest($sha256);
        if ($contentLength < 8) {
            throw new PackageException('PACKAGE_FORMAT_INVALID', 422, 'GBYL is too short.');
        }
        if ($contentLength > self::MAX_BYTES) {
            throw new PackageException('PACKAGE_TOO_LARGE', 413, 'Package exceeds 10 MiB.');
        }
        $this->ensureStorageDirectory();
        $target = $this->path($sha256);
        if (is_file($target)) {
            return $this->existingResult($sha256, $target);
        }

        $temporary = tempnam($this->packageStoragePath, '.upload-');
        if (false === $temporary) {
            throw new PackageException('PACKAGE_STORAGE_FAILURE', 500, 'Temporary package cannot be created.');
        }
        $output = @fopen($temporary, 'wb');
        if (false === $output) {
            @unlink($temporary);
            throw new PackageException('PACKAGE_STORAGE_FAILURE', 500, 'Temporary package cannot be opened.');
        }

        $hash = hash_init('sha256');
        $size = 0;
        try {
            while (!feof($input)) {
                $chunk = fread($input, 65_536);
                if (false === $chunk) {
                    throw new PackageException('PACKAGE_READ_FAILURE', 400, 'Request body cannot be read.');
                }
                if ('' === $chunk) {
                    break;
                }
                $size += strlen($chunk);
                if ($size > self::MAX_BYTES || $size > $contentLength) {
                    throw new PackageException('PACKAGE_TOO_LARGE', 413, 'Package exceeds the declared limit.');
                }
                hash_update($hash, $chunk);
                if (strlen($chunk) !== fwrite($output, $chunk)) {
                    throw new PackageException('PACKAGE_STORAGE_FAILURE', 500, 'Package write failed.');
                }
            }
            if ($size !== $contentLength) {
                throw new PackageException('PACKAGE_LENGTH_MISMATCH', 400, 'Content-Length does not match the body.');
            }
            if (!hash_equals($sha256, hash_final($hash))) {
                throw new PackageException('PACKAGE_HASH_MISMATCH', 422, 'Package digest does not match the URL.');
            }
            fflush($output);
            $this->validator->validate($temporary, $size);
            fclose($output);
            $output = null;

            if (!@rename($temporary, $target)) {
                if (is_file($target)) {
                    @unlink($temporary);
                    return $this->existingResult($sha256, $target);
                }
                throw new PackageException('PACKAGE_STORAGE_FAILURE', 500, 'Atomic package publish failed.');
            }
            @chmod($target, 0640);
            return ['sha256' => $sha256, 'size' => $size, 'created' => true];
        } finally {
            if (is_resource($output)) {
                fclose($output);
            }
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
    }

    public function find(string $sha256): ?string
    {
        $this->assertDigest($sha256);
        $path = $this->path($sha256);
        return is_file($path) ? $path : null;
    }

    private function ensureStorageDirectory(): void
    {
        if (!is_dir($this->packageStoragePath) && !@mkdir($this->packageStoragePath, 0750, true)) {
            throw new PackageException('PACKAGE_STORAGE_FAILURE', 500, 'Package directory cannot be created.');
        }
    }

    /** @return array{sha256: string, size: int, created: bool} */
    private function existingResult(string $sha256, string $path): array
    {
        $size = filesize($path);
        if (false === $size || !hash_equals($sha256, hash_file('sha256', $path))) {
            throw new PackageException('PACKAGE_STORAGE_CORRUPT', 500, 'Stored package integrity check failed.');
        }
        $this->validator->validate($path, $size);
        return ['sha256' => $sha256, 'size' => $size, 'created' => false];
    }

    private function path(string $sha256): string
    {
        return rtrim($this->packageStoragePath, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$sha256.'.gbyl';
    }

    private function assertDigest(string $sha256): void
    {
        if (1 !== preg_match('/^[0-9a-f]{64}$/D', $sha256)) {
            throw new PackageException('PACKAGE_HASH_INVALID', 400, 'Package digest must be lowercase SHA-256.');
        }
    }
}
