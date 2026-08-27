<?php

declare(strict_types=1);

namespace App\Tests\Package;

use App\Package\GbylValidator;
use App\Package\PackageException;
use App\Package\PackageStore;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PackageStoreTest extends TestCase
{
    private string $directory;
    private PackageStore $store;

    protected function setUp(): void
    {
        $this->directory = sys_get_temp_dir().'/gibyeol-package-test-'.bin2hex(random_bytes(8));
        $this->store = new PackageStore($this->directory, new GbylValidator());
    }

    protected function tearDown(): void
    {
        foreach (glob($this->directory.'/*') ?: [] as $path) {
            @unlink($path);
        }
        @rmdir($this->directory);
    }

    public function testStoresValidEmptyArchiveAndIsIdempotent(): void
    {
        $archive = "GBYL\x01\x00\x00\x00";
        $digest = hash('sha256', $archive);

        self::assertSame(
            ['sha256' => $digest, 'size' => 8, 'created' => true],
            $this->store->put($digest, $this->stream($archive), 8),
        );
        self::assertSame(
            ['sha256' => $digest, 'size' => 8, 'created' => false],
            $this->store->put($digest, $this->stream($archive), 8),
        );
        self::assertFileExists((string) $this->store->find($digest));
    }

    #[DataProvider('invalidPackageProvider')]
    public function testRejectsInvalidPackage(string $digest, string $body, int $length, string $code): void
    {
        try {
            $this->store->put($digest, $this->stream($body), $length);
            self::fail('Expected PackageException.');
        } catch (PackageException $exception) {
            self::assertSame($code, $exception->errorCode);
        }
    }

    /** @return iterable<string, array{string, string, int, string}> */
    public static function invalidPackageProvider(): iterable
    {
        $valid = "GBYL\x01\x00\x00\x00";
        yield 'uppercase digest' => [strtoupper(hash('sha256', $valid)), $valid, 8, 'PACKAGE_HASH_INVALID'];
        yield 'hash mismatch' => [str_repeat('0', 64), $valid, 8, 'PACKAGE_HASH_MISMATCH'];
        yield 'length mismatch' => [hash('sha256', $valid), $valid, 9, 'PACKAGE_LENGTH_MISMATCH'];
        $trailing = $valid."\x00";
        yield 'trailing byte' => [hash('sha256', $trailing), $trailing, 9, 'PACKAGE_FORMAT_INVALID'];
    }

    /** @return resource */
    private function stream(string $body)
    {
        $stream = fopen('php://temp', 'w+b');
        self::assertIsResource($stream);
        fwrite($stream, $body);
        rewind($stream);
        return $stream;
    }
}
