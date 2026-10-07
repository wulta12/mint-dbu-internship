-- =============================================
-- MinT Online Training Management System
-- Incremental upgrade: assessment integrity, AI
-- assistants, certificate identity + verification.
--
-- Safe to run multiple times (all statements are
-- idempotent).
--
--   psql -U postgres -d mint_training_system -f database/v3_upgrade.sql
-- or
--   node backend/migrate-v3.js
-- =============================================

-- =============================================
-- 1. Trainee identity: first_name + last_name
--
-- The certificate MUST take the trainee name from
-- the user record (resolved from the authenticated
-- trainee_id), never from the request body.
-- full_name stays the column the rest of the app
-- uses; first/last are derived from it and kept in
-- sync by the API.
-- =============================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Backfill: first token -> first_name, remainder -> last_name.
UPDATE users
SET first_name = COALESCE(first_name, NULLIF(split_part(trim(full_name), ' ', 1), '')),
    last_name  = COALESCE(last_name, NULLIF(trim(substr(trim(full_name), strpos(trim(full_name) || ' ', ' ') + 1)), ''))
WHERE first_name IS NULL OR last_name IS NULL;

-- =============================================
-- 2. System settings (admin controlled switches)
--
-- The Trainer AI Assistant switch is stored HERE so
-- the backend - not the React app - is the single
-- authority on whether trainers may use it.
-- =============================================
CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_by  INT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_settings_updated ON system_settings;
CREATE TRIGGER trg_system_settings_updated
BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE FUNCTION set_system_settings_updated_at();

-- Trainer AI Assistant is ON by default.
INSERT INTO system_settings (key, value)
VALUES ('trainer_ai_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 3. Assessment anti-cheating configuration
-- =============================================
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;
-- NOTE: the attempt limit was retired in v4 (v4_unlimited_attempts.sql).
-- max_attempts is kept only for backward compatibility and is no longer
-- enforced. Running this file again is harmless: the backend ignores the
-- column, and v4 will clear it.
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3;
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE assessments
    DROP CONSTRAINT IF EXISTS assessments_time_limit_check;
ALTER TABLE assessments
    ADD CONSTRAINT assessments_time_limit_check
    CHECK (time_limit_minutes IS NULL OR (time_limit_minutes > 0 AND time_limit_minutes <= 600));

ALTER TABLE assessments
    DROP CONSTRAINT IF EXISTS assessments_max_attempts_check;
ALTER TABLE assessments
    ADD CONSTRAINT assessments_max_attempts_check
    CHECK (max_attempts IS NULL OR max_attempts > 0);

UPDATE assessments SET max_attempts = 3 WHERE max_attempts IS NULL;

-- =============================================
-- 4. Assessment attempt integrity
--
-- expires_at / time_limit_minutes : server-side
--   deadline. A trainee cannot gain time by
--   reloading the page or restarting.
-- question_order / option_order : the randomised
--   order is snapshotted so a resumed attempt is
--   graded against the same layout.
-- timed_out / auto_submitted : recorded when the
--   deadline passes and the attempt is graded
--   server-side.
-- =============================================
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS question_order JSONB;
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS option_order JSONB;
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS timed_out BOOLEAN DEFAULT false;
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS auto_submitted BOOLEAN DEFAULT false;

-- Existing attempts never had a deadline.
UPDATE assessment_attempts
SET time_limit_minutes = NULL, expires_at = NULL
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_open
    ON assessment_attempts (trainee_id, training_id)
    WHERE submitted_at IS NULL;

-- =============================================
-- 5. Certificate identity, status and verification
--
-- trainee_name is an immutable snapshot taken from
-- the users row (first_name + last_name) at the
-- moment the certificate is issued, so the printed
-- document can never be spoofed by a request body.
-- =============================================
ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'valid';
ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS trainee_name VARCHAR(150);
ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS revoked_by INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

ALTER TABLE certificates
    DROP CONSTRAINT IF EXISTS certificates_status_check;
ALTER TABLE certificates
    ADD CONSTRAINT certificates_status_check
    CHECK (status IN ('valid', 'revoked'));

UPDATE certificates SET status = 'valid' WHERE status IS NULL;

-- Backfill any missing verification code so every
-- certificate is verifiable by QR.
UPDATE certificates
SET verification_code = upper(substr(md5(random()::text || clock_timestamp()::text), 1, 16))
WHERE verification_code IS NULL OR verification_code = '';

-- Backfill the trainee name snapshot from the user record.
UPDATE certificates c
SET trainee_name = NULLIF(trim(
        concat_ws(' ', u.first_name, u.last_name, CASE WHEN coalesce(u.first_name, u.last_name) IS NULL THEN u.full_name END)
    ), '')
FROM users u
WHERE u.id = c.trainee_id
  AND (c.trainee_name IS NULL OR c.trainee_name = '');

CREATE INDEX IF NOT EXISTS idx_certificates_verification_code
    ON certificates (verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_number
    ON certificates (certificate_number);
