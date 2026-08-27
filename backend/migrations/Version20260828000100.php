<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260828000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create authentication, mailbox, verification, and notification tables.';
    }

    public function isTransactional(): bool
    {
        return false;
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE auth_nonces (nonce_hash BINARY(32) NOT NULL, wallet_address CHAR(42) NOT NULL, chain_id BIGINT UNSIGNED NOT NULL, expires_at DATETIME(6) NOT NULL, used_at DATETIME(6) DEFAULT NULL, created_at DATETIME(6) NOT NULL, INDEX idx_auth_nonce_wallet (wallet_address), INDEX idx_auth_nonce_expires (expires_at), PRIMARY KEY(nonce_hash)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE sessions (token_hash BINARY(32) NOT NULL, wallet_address CHAR(42) NOT NULL, expires_at DATETIME(6) NOT NULL, created_at DATETIME(6) NOT NULL, last_seen_at DATETIME(6) NOT NULL, INDEX idx_session_wallet (wallet_address), INDEX idx_session_expires (expires_at), PRIMARY KEY(token_hash)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE mailboxes (wallet_address CHAR(42) NOT NULL, email_ciphertext VARBINARY(512) NOT NULL, email_iv BINARY(12) NOT NULL, email_tag BINARY(16) NOT NULL, email_lookup_hash BINARY(32) NOT NULL, email_verified_at DATETIME(6) NOT NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL, UNIQUE INDEX uniq_mailbox_email (email_lookup_hash), PRIMARY KEY(wallet_address)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE email_verifications (id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL, wallet_address CHAR(42) NOT NULL, email_ciphertext VARBINARY(512) NOT NULL, email_iv BINARY(12) NOT NULL, email_tag BINARY(16) NOT NULL, email_lookup_hash BINARY(32) NOT NULL, code_hash BINARY(32) NOT NULL, expires_at DATETIME(6) NOT NULL, attempts TINYINT UNSIGNED DEFAULT 0 NOT NULL, verified_at DATETIME(6) DEFAULT NULL, created_at DATETIME(6) NOT NULL, INDEX idx_email_verification_wallet (wallet_address), INDEX idx_email_verification_expires (expires_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE notifications (id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL, campaign VARCHAR(64) NOT NULL, wallet_address CHAR(42) NOT NULL, letter_count INT UNSIGNED NOT NULL, provider_message_id VARCHAR(255) DEFAULT NULL, status VARCHAR(32) NOT NULL, sent_at DATETIME(6) DEFAULT NULL, delivered_at DATETIME(6) DEFAULT NULL, failed_at DATETIME(6) DEFAULT NULL, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL, UNIQUE INDEX uniq_notification_campaign_wallet (campaign, wallet_address), INDEX idx_notification_provider (provider_message_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE notifications');
        $this->addSql('DROP TABLE email_verifications');
        $this->addSql('DROP TABLE mailboxes');
        $this->addSql('DROP TABLE sessions');
        $this->addSql('DROP TABLE auth_nonces');
    }
}
