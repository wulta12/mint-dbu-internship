-- =============================================
-- MinT LMS - v4 upgrade
-- Removes the assessment attempt limit.
--
-- Policy change: a trainee may sit the final assessment as many times
-- as they need. The only limit that remains is the per-attempt time
-- limit (assessments.time_limit_minutes), which is unchanged and is
-- still enforced on the server via assessment_attempts.expires_at.
--
-- The assessments.max_attempts column is RETAINED so that existing
-- databases and any external tooling keep working, but it is no longer
-- populated, no longer defaulted to 3, and no longer enforced. It is
-- cleared to NULL below.
--
-- Idempotent: safe to run multiple times.
-- =============================================

-- 1. No more implicit "3 attempts" default.
ALTER TABLE assessments
    ALTER COLUMN max_attempts DROP DEFAULT;

-- 2. Clear any previously stored attempt caps.
UPDATE assessments SET max_attempts = NULL WHERE max_attempts IS NOT NULL;

-- 3. Keep the value check but make the column purely informational:
--    only NULL (no limit) or a positive number is meaningful.
ALTER TABLE assessments
    DROP CONSTRAINT IF EXISTS assessments_max_attempts_check;
ALTER TABLE assessments
    ADD CONSTRAINT assessments_max_attempts_check
    CHECK (max_attempts IS NULL OR max_attempts > 0);

-- =============================================
-- 4. Per-attempt timing (unchanged, re-asserted for clarity)
--
-- The countdown the trainee sees is derived from these columns, which
-- are written by the server when the attempt is created. Refreshing the
-- page resumes the SAME attempt row, so the deadline cannot be reset:
--   started_at             - when the trainee pressed Start
--   time_limit_minutes     - the limit snapshotted from the assessment
--   expires_at             - the authoritative deadline
-- =============================================
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;
