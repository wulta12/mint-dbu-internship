-- v5: video playback attestations
--
-- A required video lesson can only be completed by watching it. When the
-- lesson's provider cannot report playback progress (an unknown embed host,
-- for example) the 80% rule can never be satisfied, which would leave the
-- trainee permanently stuck. In that case only, the trainee may confirm they
-- watched it, and that confirmation is recorded here so it is auditable.
--
-- The columns are nullable and never set automatically.
--
-- Idempotent: safe to run more than once.

ALTER TABLE trainee_progress
  ADD COLUMN IF NOT EXISTS video_attested_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS video_attested_reason VARCHAR(255);

COMMENT ON COLUMN trainee_progress.video_attested_at IS
  'When the trainee personally confirmed watching a video whose provider cannot report playback progress';
COMMENT ON COLUMN trainee_progress.video_attested_reason IS
  'Why the automatic 80% rule did not apply to this lesson';