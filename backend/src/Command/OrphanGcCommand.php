<?php

declare(strict_types=1);

namespace App\Command;

use App\Operations\OrphanGarbageCollector;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:packages:gc', description: 'Report or delete old packages not referenced by safe chain logs.')]
final class OrphanGcCommand extends Command
{
    public function __construct(private readonly OrphanGarbageCollector $collector)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('apply', null, InputOption::VALUE_NONE, 'Delete reported candidates. Without this flag the command is dry-run only.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        try {
            $output->writeln(json_encode($this->collector->run((bool) $input->getOption('apply')), JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
            return Command::SUCCESS;
        } catch (\Throwable $exception) {
            $output->writeln(json_encode(['ok' => false, 'error' => $exception->getMessage()], JSON_THROW_ON_ERROR));
            return Command::FAILURE;
        }
    }
}
