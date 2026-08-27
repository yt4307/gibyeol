<?php

declare(strict_types=1);

namespace App\Operations;

use Symfony\Component\Lock\LockFactory;

final class OrphanGarbageCollector
{
    public function __construct(
        private readonly ChainIndex $chainIndex,
        private readonly LockFactory $lockFactory,
        private readonly string $packageStoragePath,
        private readonly int $orphanMinAgeSeconds,
    ) {
    }

    /** @return array{mode: string, safeBlock: int, candidates: list<array{sha256: string, size: int, ageSeconds: int}>, deleted: list<string>} */
    public function run(bool $apply, ?int $now = null): array
    {
        $lock = $this->lockFactory->createLock('gibyeol-orphan-gc', 300);
        if (!$lock->acquire()) {
            throw new \RuntimeException('Another orphan GC run is active.');
        }
        try {
            // Fetch and validate every safe log page before inspecting or deleting files.
            $snapshot = $this->chainIndex->snapshot();
            $now ??= time();
            $candidates = [];
            foreach (glob(rtrim($this->packageStoragePath, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'*.gbyl') ?: [] as $path) {
                $filename = basename($path);
                if (1 !== preg_match('/^([0-9a-f]{64})\.gbyl$/D', $filename, $matches)) {
                    continue;
                }
                $mtime = filemtime($path);
                $size = filesize($path);
                if (false === $mtime || false === $size) {
                    throw new \RuntimeException('Package metadata could not be read; GC aborted.');
                }
                $age = $now - $mtime;
                if ($age >= $this->orphanMinAgeSeconds && !isset($snapshot->archiveHashes[$matches[1]])) {
                    $candidates[] = ['sha256' => $matches[1], 'size' => $size, 'ageSeconds' => $age];
                }
            }
            $deleted = [];
            if ($apply) {
                foreach ($candidates as $candidate) {
                    $path = rtrim($this->packageStoragePath, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$candidate['sha256'].'.gbyl';
                    if (!is_file($path) || !@unlink($path)) {
                        throw new \RuntimeException('An orphan package could not be deleted.');
                    }
                    $deleted[] = $candidate['sha256'];
                }
            }
            return ['mode' => $apply ? 'apply' : 'dry-run', 'safeBlock' => $snapshot->safeBlock, 'candidates' => $candidates, 'deleted' => $deleted];
        } finally {
            $lock->release();
        }
    }
}
