-- =============================================
-- MinT Online Training Management System
-- Incremental updates (v2 professional fixes)
--
-- 1. training_departments: many-to-many link between trainings and
--    departments so a training can be explicitly assigned to MORE than
--    one department (Case B), in addition to the existing:
--      Case A: single department (subject's department, legacy)
--      Case C: all departments (is_all_departments = true)
--
--    Semantics:
--      - is_all_departments = true            -> open to every department
--      - training_departments rows exist      -> open ONLY to those departments
--      - otherwise                            -> open only to the subject's department
--
-- 2. training_requests.cancelled status + cancelled_by / cancelled_at
--    columns (trainees can cancel their own PENDING request).
--
-- 3. contact_messages table (honest handling of the public contact form).
--
-- 4. enforce_department_enrollment trigger now also honours the explicit
--    department assignments table.
-- =============================================

-- =============================================
-- 1. Explicit per-department training assignments
-- =============================================
CREATE TABLE IF NOT EXISTS training_departments (
    training_id   INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (training_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_training_departments_department
    ON training_departments(department_id);

-- =============================================
-- 2. Cancelled enrollment requests
-- =============================================
ALTER TABLE training_requests
    DROP CONSTRAINT IF EXISTS training_requests_status_check;

ALTER TABLE training_requests
    ADD CONSTRAINT training_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));

ALTER TABLE training_requests
    ADD COLUMN IF NOT EXISTS cancelled_by INT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE training_requests
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- =============================================
-- 3. Contact messages (public contact form)
-- =============================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    email      VARCHAR(150) NOT NULL,
    subject    VARCHAR(200),
    message    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. Department enrollment trigger (updated)
-- =============================================
CREATE OR REPLACE FUNCTION enforce_department_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  training_dept INT;
  trainee_dept  INT;
  is_all_depts  BOOLEAN;
BEGIN
  SELECT t.is_all_departments, s.department_id INTO is_all_depts, training_dept
  FROM trainings t
  JOIN subjects s ON t.subject_id = s.id
  WHERE t.id = NEW.training_id;

  SELECT department_id INTO trainee_dept
  FROM users
  WHERE id = NEW.trainee_id;

  IF NOT COALESCE(is_all_depts, false) THEN
    IF EXISTS (SELECT 1 FROM training_departments td WHERE td.training_id = NEW.training_id) THEN
      -- Explicit multi-department assignment: trainee must be in the list
      IF NOT EXISTS (
        SELECT 1 FROM training_departments td
        WHERE td.training_id = NEW.training_id AND td.department_id = trainee_dept
      ) THEN
        RAISE EXCEPTION 'Training is not assigned to your department';
      END IF;
    ELSE
      -- Legacy / single-department: use the subject's department
      IF training_dept IS NULL OR trainee_dept IS NULL OR training_dept <> trainee_dept THEN
        RAISE EXCEPTION 'Training is not assigned to your department';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. Internal Messages (admin sends messages to users, replies)
--
-- The canonical, commented version of this block lives in
-- database/internal_messages.sql together with its indexes; keep the two in
-- step when either is edited.
-- =============================================
CREATE TABLE IF NOT EXISTS internal_messages (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    parent_id INT REFERENCES internal_messages(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient
    ON internal_messages(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_messages_sender
    ON internal_messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_messages_unread
    ON internal_messages(recipient_id) WHERE is_read = false;

-- =============================================
-- 6. Contact messages reply tracking
-- =============================================
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS is_replied BOOLEAN DEFAULT false;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS reply_message TEXT;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS replied_by INT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_messages_replied
    ON contact_messages(is_replied) WHERE is_replied = true;
