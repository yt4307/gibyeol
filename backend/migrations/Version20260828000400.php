<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260828000400 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add notification claim leases and retry scheduling.';
    }

    public function isTransactional(): bool
    {
        return false;
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE notifications ADD attempt_count INT UNSIGNED DEFAULT 0 NOT NULL, ADD claimed_at DATETIME(6) DEFAULT NULL, ADD next_retry_at DATETIME(6) DEFAULT NULL, ADD INDEX idx_notification_retry (status, next_retry_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE notifications DROP INDEX idx_notification_retry, DROP attempt_count, DROP claimed_at, DROP next_retry_at');
    }
}
