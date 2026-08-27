<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260828000300 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Track processed provider webhook identifiers for idempotency.';
    }

    public function isTransactional(): bool
    {
        return false;
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE webhook_events (event_id VARCHAR(255) NOT NULL, provider VARCHAR(32) NOT NULL, received_at DATETIME(6) NOT NULL, PRIMARY KEY(event_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE webhook_events');
    }
}
