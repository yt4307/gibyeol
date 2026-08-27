<?php

declare(strict_types=1);

namespace App\Tests\Operations;

use App\Operations\ChainIndex;
use App\Operations\ChainSnapshot;
use App\Operations\OrphanGarbageCollector;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\Lock\Store\FlockStore;

final class OrphanGarbageCollectorTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        $this->directory = sys_get_temp_dir().'/gibyeol-gc-'.bin2hex(random_bytes(6));
        mkdir($this->directory, 0700);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->directory.'/*') ?: [] as $path) {
            unlink($path);
        }
        rmdir($this->directory);
    }

    public function testReportsFirstAndDeletesOnlyOldUnreferencedPackage(): void
    {
        $referenced = str_repeat('a', 64);
        $orphan = str_repeat('b', 64);
        file_put_contents($this->directory.'/'.$referenced.'.gbyl', 'referenced');
        file_put_contents($this->directory.'/'.$orphan.'.gbyl', 'orphan');
        touch($this->directory.'/'.$referenced.'.gbyl', 100);
        touch($this->directory.'/'.$orphan.'.gbyl', 100);
        $index = $this->index(new ChainSnapshot(200, 190, [], [$referenced => true]));
        $collector = new OrphanGarbageCollector($index, new LockFactory(new FlockStore($this->directory)), $this->directory, 50);

        $report = $collector->run(false, 200);
        self::assertSame([$orphan], array_column($report['candidates'], 'sha256'));
        self::assertFileExists($this->directory.'/'.$orphan.'.gbyl');

        $applied = $collector->run(true, 200);
        self::assertSame([$orphan], $applied['deleted']);
        self::assertFileDoesNotExist($this->directory.'/'.$orphan.'.gbyl');
        self::assertFileExists($this->directory.'/'.$referenced.'.gbyl');
    }

    public function testRpcFailureNeverDeletesPackage(): void
    {
        $hash = str_repeat('c', 64);
        file_put_contents($this->directory.'/'.$hash.'.gbyl', 'keep');
        touch($this->directory.'/'.$hash.'.gbyl', 100);
        $index = new class implements ChainIndex {
            public function snapshot(): ChainSnapshot { throw new \RuntimeException('RPC unavailable'); }
        };
        $collector = new OrphanGarbageCollector($index, new LockFactory(new FlockStore($this->directory)), $this->directory, 50);

        try {
            $collector->run(true, 200);
            self::fail('RPC failure should abort GC.');
        } catch (\RuntimeException) {
            self::assertFileExists($this->directory.'/'.$hash.'.gbyl');
        }
    }

    private function index(ChainSnapshot $snapshot): ChainIndex
    {
        return new class($snapshot) implements ChainIndex {
            public function __construct(private readonly ChainSnapshot $snapshot) {}
            public function snapshot(): ChainSnapshot { return $this->snapshot; }
        };
    }
}
