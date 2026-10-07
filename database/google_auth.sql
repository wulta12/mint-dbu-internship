-- Adds Google sign-in support to the users table.
--
-- "Continue with Google" is an ADDITIONAL way to sign in to an account that
-- already exists. It does not create accounts, so the existing registration
-- rules are untouched: every user still registers with an email + password,
-- keeps their role (admin / trainer / trainee), and keeps their department.
--
-- Therefore `password` stays NOT NULL. A Google-only account is never created,
-- so there is always a password hash to fall back on and the existing
-- forgot-password flow keeps working for every user.
--
-- Idempotent: safe to run more than once.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'local';

-- How the account most recently authenticated, for display / auditing only.
--   'local' - email + password (the default for every existing account)
--   'google' - most recently signed in through Google
-- It never gates access: password login never reads it, so linking Google
-- cannot lock anyone out of their password.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_provider_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_auth_provider_check
      CHECK (auth_provider IN ('local', 'google'));
  END IF;
END
$$;

-- The Google account's immutable subject id ("sub"). This, not the email, is
-- what identifies the Google identity: an email address can be changed or
-- reassigned by whoever controls the domain, whereas `sub` is stable for the
-- lifetime of the Google account.
--
-- Partial unique index rather than a UNIQUE column so the many existing rows
-- with NULL (never signed in with Google) stay allowed.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
  ON users (google_id)
  WHERE google_id IS NOT NULL;
