-- =============================================
-- Migration: password reset tokens
-- Safe to run on an existing database. Does NOT
-- touch any other table, and is idempotent.
--
-- Only the SHA-256 hash of a reset token is ever
-- stored here, never the token itself, so a leaked
-- database dump cannot be used to reset anyone's
-- password. `used_at` makes each token single-use,
-- and `expires_at` bounds its lifetime.
--
-- schema.sql creates this table already, but
-- schema.sql begins with DROP TABLE ... CASCADE
-- so it can only be used for a fresh install.
-- Run THIS file to add the table to an existing
-- database.
-- =============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lookup by hash is the hot path when a link is followed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_hash
    ON password_reset_tokens(token_hash);

-- Per-user cleanup and the "invalidate all prior tokens" sweep.
CREATE INDEX IF NOT EXISTS idx_password_reset_user
    ON password_reset_tokens(user_id);

-- Housekeeping: find rows that are spent or stale.
CREATE INDEX IF NOT EXISTS idx_password_reset_expires
    ON password_reset_tokens(expires_at);
