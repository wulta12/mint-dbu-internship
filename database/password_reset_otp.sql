-- =============================================
-- Migration: password reset OTP codes
-- Safe to run on an existing database. Does NOT
-- touch any other table, and is idempotent.
--
-- Only HMAC-SHA256(OTP_PEPPER, otp) is ever
-- stored, never the code itself, and the pepper
-- lives in .env rather than here - which is the
-- whole point. A 6-digit code has just 1,000,000
-- possible values, so a plain SHA-256 column
-- could be reversed from a database dump in
-- seconds by hashing all one million candidates.
-- Keyed, an attacker holding only the dump still
-- has to guess the pepper.
--
-- `used_at` makes a code single-use, `expires_at`
-- bounds its life, and `attempts` caps guessing at
-- five tries per issued code.
-- =============================================

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(64) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification looks a row up by (user_id, otp_hash): the code identifies the
-- user's current code, not the code on its own. Deliberately NOT unique on
-- otp_hash - two users can be issued the same six digits, and a unique index
-- would then reject a legitimate second issuance.
CREATE INDEX IF NOT EXISTS idx_password_reset_otp_lookup
    ON password_reset_otps(user_id, otp_hash);

-- "Invalidate everything outstanding for this user" on a new code or resend.
CREATE INDEX IF NOT EXISTS idx_password_reset_otp_user
    ON password_reset_otps(user_id);

-- Housekeeping: find rows that are spent, exhausted, or stale.
CREATE INDEX IF NOT EXISTS idx_password_reset_otp_expires
    ON password_reset_otps(expires_at);
