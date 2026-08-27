<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260828000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Store a keyed IP hash for email challenge rate limiting.';
    }

    public function isTransactional(): bool
    {
        return false;
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE email_verifications ADD request_ip_hash BINARY(32) NOT NULL, ADD INDEX idx_email_verification_ip (request_ip_hash)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE email_verifications DROP INDEX idx_email_verification_ip, DROP request_ip_hash');
    }
}
