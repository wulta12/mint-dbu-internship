-- =============================================
-- MinT Training System - Database Updates
--
-- Run this file against an EXISTING database that was
-- created before the training_materials feature.
-- (For a fresh install, database/schema.sql already
--  includes this table.)
-- =============================================

CREATE TABLE IF NOT EXISTS training_materials (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_materials_training ON training_materials(training_id);

-- =============================================
-- "All Departments" trainings feature.
-- Run against an EXISTING database created before this feature.
-- (For a fresh install, database/schema.sql already includes this.)
-- =============================================
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS is_all_departments BOOLEAN DEFAULT false;

-- Re-create the enrollment trigger so it respects is_all_departments.
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

  IF (NOT COALESCE(is_all_depts, false)) AND (training_dept IS NULL OR trainee_dept IS NULL OR training_dept <> trainee_dept) THEN
    RAISE EXCEPTION 'Training is not assigned to your department';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
