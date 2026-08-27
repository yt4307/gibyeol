<?php

declare(strict_types=1);

namespace App\Package;

final class GbylValidator
{
    public function validate(string $path, int $expectedSize): void
    {
        $stream = @fopen($path, 'rb');
        if (false === $stream) {
            throw new PackageException('PACKAGE_STORAGE_FAILURE', 500, 'Package file cannot be opened.');
        }

        try {
            if ('GBYL' !== $this->readExact($stream, 4) || "\x01" !== $this->readExact($stream, 1)) {
                throw new PackageException('PACKAGE_FORMAT_INVALID', 422, 'GBYL magic or version is invalid.');
            }
            if ("\x00" !== $this->readExact($stream, 1)) {
                throw new PackageException('PACKAGE_FORMAT_INVALID', 422, 'GBYL header flags are invalid.');
            }
            $itemCount = unpack('n', $this->readExact($stream, 2))[1];

            for ($index = 0; $index < $itemCount; ++$index) {
                $type = ord($this->readExact($stream, 1));
                $codec = ord($this->readExact($stream, 1));
                $validMapping = (1 === $type && in_array($codec, [1, 2], true))
                    || (2 === $type && in_array($codec, [16, 17], true));
                if (!$validMapping || "\x00\x00" !== $this->readExact($stream, 2)) {
                    throw new PackageException('PACKAGE_FORMAT_INVALID', 422, 'GBYL item metadata is invalid.');
                }
                $this->readExact($stream, 12);
                $ciphertextLength = unpack('N', $this->readExact($stream, 4))[1];
                if ($ciphertextLength < 16) {
                    throw new PackageException('PACKAGE_FORMAT_INVALID', 422, 'GBYL item tag is missing.');
                }
                $this->skipExact($stream, $ciphertextLength);
            }

            if (ftell($stream) !== $expectedSize || false !== fgetc($stream)) {
                throw new PackageException('PACKAGE_FORMAT_INVALID', 422, 'GBYL contains trailing or truncated bytes.');
            }
        } finally {
            fclose($stream);
        }
    }

    /** @param resource $stream */
    private function readExact($stream, int $length): string
    {
        $output = '';
        while (strlen($output) < $length && !feof($stream)) {
            $chunk = fread($stream, $length - strlen($output));
            if (false === $chunk) {
                break;
            }
            $output .= $chunk;
        }
        if (strlen($output) !== $length) {
            throw new PackageException('PACKAGE_FORMAT_INVALID', 422, 'GBYL is truncated.');
        }
        return $output;
    }

    /** @param resource $stream */
    private function skipExact($stream, int $length): void
    {
        $remaining = $length;
        while ($remaining > 0) {
            $chunk = fread($stream, min(65_536, $remaining));
            if (false === $chunk || '' === $chunk) {
                throw new PackageException('PACKAGE_FORMAT_INVALID', 422, 'GBYL ciphertext is truncated.');
            }
            $remaining -= strlen($chunk);
        }
    }
}
