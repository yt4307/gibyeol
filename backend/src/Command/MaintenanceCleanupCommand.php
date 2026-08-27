<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Lock\LockFactory;

#[AsCommand(name: 'app:maintenance:cleanup', description: 'Remove expired authentication records and abandoned upload temporaries.')]
final class MaintenanceCleanupCommand extends Command
{
    public function __construct(
        private readonly Connection $connection,
        private readonly LockFactory $lockFactory,
        private readonly string $packageStoragePath,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $lock = $this->lockFactory->createLock('gibyeol-maintenance-cleanup', 300);
        if (!$lock->acquire()) {
            $output->writeln('{"ok":false,"error":"cleanup already active"}');
            return Command::FAILURE;
        }
        try {
            $result = [
                'sessions' => $this->connection->executeStatement('DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP(6)'),
                'nonces' => $this->connection->executeStatement('DELETE FROM auth_nonces WHERE expires_at < UTC_TIMESTAMP(6) - INTERVAL 7 DAY'),
                'emailVerifications' => $this->connection->executeStatement('DELETE FROM email_verifications WHERE created_at < UTC_TIMESTAMP(6) - INTERVAL 30 DAY'),
                'webhookEvents' => $this->connection->executeStatement('DELETE FROM webhook_events WHERE received_at < UTC_TIMESTAMP(6) - INTERVAL 90 DAY'),
                'temporaryPackages' => 0,
            ];
            foreach (glob(rtrim($this->packageStoragePath, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'.upload-*') ?: [] as $path) {
                $mtime = filemtime($path);
                if (false !== $mtime && $mtime < time() - 86_400 && @unlink($path)) {
                    ++$result['temporaryPackages'];
                }
            }
            $output->writeln(json_encode($result, JSON_THROW_ON_ERROR));
            return Command::SUCCESS;
        } finally {
            $lock->release();
        }
    }
}
