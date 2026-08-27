<?php

declare(strict_types=1);

namespace App\Command;

use App\Operations\ChristmasPostman;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:postman:christmas-2026', description: 'Send one idempotent arrival notification per recipient wallet.')]
final class ChristmasPostmanCommand extends Command
{
    public function __construct(private readonly ChristmasPostman $postman)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        try {
            $result = $this->postman->run();
            $output->writeln(json_encode($result, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
            return $result['failed'] > 0 ? Command::FAILURE : Command::SUCCESS;
        } catch (\Throwable $exception) {
            $output->writeln(json_encode(['ok' => false, 'error' => $exception->getMessage()], JSON_THROW_ON_ERROR));
            return Command::FAILURE;
        }
    }
}
