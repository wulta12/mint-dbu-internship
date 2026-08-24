-- =============================================
-- MinT Online Training Management System
-- Database Schema
--
-- Entity hierarchy (foreign-key enforced):
--   departments -> subjects -> trainings -> training_requests -> trainees
--
-- A trainee belongs to a department (users.department_id).
-- A training belongs to a subject (trainings.subject_id), and the subject
-- belongs to a department (subjects.department_id).
-- A trainee may only request trainings whose subject belongs to the trainee's
-- own department. This is enforced by a database trigger AND the API.
-- =============================================

-- =============================================
-- Drop tables if they exist (in dependency order)
-- =============================================
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS training_requests CASCADE;
DROP TABLE IF EXISTS trainings CASCADE;
DROP TABLE IF EXISTS trainers CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- =============================================
-- Helper: automatically refresh updated_at
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Departments Table
-- =============================================
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_departments_updated
BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Subjects Table (belongs to a department)
-- =============================================
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (department_id, name)
);

CREATE TRIGGER trg_subjects_updated
BEFORE UPDATE ON subjects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Users Table
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'trainer', 'trainee')),
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    department_locked BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Trainers Table (extended trainer profile)
-- =============================================
CREATE TABLE trainers (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    specialization VARCHAR(200),
    qualification VARCHAR(200),
    biography TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_trainers_updated
BEFORE UPDATE ON trainers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Trainings Table (belongs to a subject)
-- Department is derived through the subject's department.
-- is_all_departments = true means the training is open to trainees of
-- every department (subject may still belong to any department).
-- =============================================
CREATE TABLE trainings (
    id SERIAL PRIMARY KEY,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    is_all_departments BOOLEAN DEFAULT false,
    training_title VARCHAR(200) NOT NULL,
    training_description TEXT,
    training_type VARCHAR(50) CHECK (training_type IN ('Online', 'Offline', 'Hybrid')),
    location_or_meeting_link VARCHAR(255),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    capacity INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('open', 'closed', 'in_progress', 'completed', 'draft')),
    trainer_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trainings_subject_id ON trainings(subject_id);
CREATE INDEX idx_trainings_status ON trainings(status);

CREATE TRIGGER trg_trainings_updated
BEFORE UPDATE ON trainings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Training Requests Table
--
-- Trainees first REQUEST a training (status = pending).
-- An admin APPROVES (trainee becomes enrolled) or REJECTS the request.
-- Approval / rejection metadata is recorded.
--
-- Only ONE active request (pending or approved) may exist per trainee per
-- training. A rejected request may be re-submitted.
-- =============================================
CREATE TABLE training_requests (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    trainee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejected_by INT REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_requests_training ON training_requests(training_id);
CREATE INDEX idx_training_requests_trainee ON training_requests(trainee_id);
CREATE INDEX idx_training_requests_status ON training_requests(status);

-- Enforce one active request (pending/approved) per (training, trainee) at the DB level.
CREATE UNIQUE INDEX uq_training_requests_active
ON training_requests(training_id, trainee_id)
WHERE status IN ('pending', 'approved');

CREATE TRIGGER trg_training_requests_updated
BEFORE UPDATE ON training_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Attendance Table
-- =============================================
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    training_id INT REFERENCES trainings(id) ON DELETE CASCADE,
    trainee_id INT REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    attendance_status VARCHAR(20) DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
    marked_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(training_id, trainee_id, attendance_date)
);

-- =============================================
-- Certificates Table
-- =============================================
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    training_id INT REFERENCES trainings(id) ON DELETE CASCADE,
    trainee_id INT REFERENCES users(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    verification_code VARCHAR(100) UNIQUE,
    issue_date DATE DEFAULT CURRENT_DATE,
    file_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(training_id, trainee_id)
);

-- =============================================
-- Training Materials Table (uploaded by trainers / admins)
-- =============================================
CREATE TABLE training_materials (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_materials_training ON training_materials(training_id);

-- =============================================
-- Training Modules (a training is organised into modules)
-- =============================================
CREATE TABLE training_modules (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_modules_training ON training_modules(training_id);

CREATE TRIGGER trg_training_modules_updated
BEFORE UPDATE ON training_modules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Lessons / Learning Activities
-- =============================================
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    module_id INT REFERENCES training_modules(id) ON DELETE SET NULL,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'text'
        CHECK (type IN ('text', 'video', 'pdf', 'document', 'link')),
    content TEXT,
    video_url VARCHAR(500),
    video_progress_threshold INT DEFAULT 80,
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    file_size BIGINT DEFAULT 0,
    file_type VARCHAR(100),
    external_url VARCHAR(500),
    is_required BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT true,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lessons_training ON lessons(training_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);

CREATE TRIGGER trg_lessons_updated
BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Trainee Progress (per lesson, persisted in DB)
-- =============================================
CREATE TABLE trainee_progress (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    trainee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed')),
    last_video_position REAL DEFAULT 0,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (training_id, trainee_id, lesson_id)
);

CREATE INDEX idx_trainee_progress_trainee ON trainee_progress(trainee_id);
CREATE INDEX idx_trainee_progress_training ON trainee_progress(training_id);

-- =============================================
-- Assessments (one final assessment per training)
-- =============================================
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL UNIQUE REFERENCES trainings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    pass_score INT DEFAULT 70,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_assessments_updated
BEFORE UPDATE ON assessments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Assessment Questions
-- =============================================
CREATE TABLE assessment_questions (
    id SERIAL PRIMARY KEY,
    assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessment_questions_assessment ON assessment_questions(assessment_id);

-- =============================================
-- Assessment Attempts
-- =============================================
CREATE TABLE assessment_attempts (
    id SERIAL PRIMARY KEY,
    assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    trainee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    answers JSONB,
    score INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    passed BOOLEAN DEFAULT false,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessment_attempts_trainee ON assessment_attempts(trainee_id);
CREATE INDEX idx_assessment_attempts_training ON assessment_attempts(training_id);

-- =============================================
-- Enforce department-based enrollment at DB level.
-- A trainee may only have a request for a training whose subject belongs
-- to the trainee's OWN department, UNLESS the training is flagged as
-- open to all departments (is_all_departments = true).
-- This is the last line of defense even if the API layer is bypassed.
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

  IF (NOT COALESCE(is_all_depts, false)) AND (training_dept IS NULL OR trainee_dept IS NULL OR training_dept <> trainee_dept) THEN
    RAISE EXCEPTION 'Training is not assigned to your department';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_department_enrollment
BEFORE INSERT ON training_requests
FOR EACH ROW
EXECUTE FUNCTION enforce_department_enrollment();

-- =============================================
-- Seed Departments
-- =============================================
INSERT INTO departments (name, description, is_active) VALUES
('Information Technology', 'Training on networking, cyber security, web development and database management', true),
('Digital Technology', 'Training on artificial intelligence, cloud computing and digital transformation', true),
('Computer Science', 'Training on programming fundamentals, algorithms and software engineering', true),
('Data Science', 'Training on statistics, machine learning and data analysis', true);

-- =============================================
-- Seed Subjects (one department owns many subjects)
-- =============================================
INSERT INTO subjects (department_id, name, description, is_active) VALUES
-- Information Technology (1)
(1, 'Cyber Security', 'Security fundamentals, network defense and ethical hacking', true),
(1, 'Networking', 'Network fundamentals, routing, switching and infrastructure', true),
(1, 'Web Development', 'HTML, CSS, JavaScript and modern front-end development', true),
(1, 'Database Management', 'Relational design, SQL and database administration', true),
-- Digital Technology (2)
(2, 'Artificial Intelligence', 'Foundations of AI, machine learning and intelligent systems', true),
(2, 'Cloud Computing', 'Cloud architecture, services and deployment models', true),
(2, 'Digital Transformation', 'Digital strategy, innovation and change leadership', true),
-- Computer Science (3)
(3, 'Programming Fundamentals', 'Programming logic, languages and problem solving', true),
(3, 'Algorithms', 'Algorithm design, analysis and complexity', true),
(3, 'Software Engineering', 'Software development lifecycle, practices and project management', true),
-- Data Science (4)
(4, 'Statistics', 'Descriptive and inferential statistics, probability and hypothesis testing', true),
(4, 'Machine Learning', 'Supervised and unsupervised learning with practical tooling', true),
(4, 'Data Analysis', 'Exploratory data analysis, cleaning and insights with Python', true);

-- =============================================
-- Seed Users
-- Password for all: password123
-- =============================================
INSERT INTO users (full_name, email, password, phone, role, department_id, department_locked, is_active) VALUES
('Admin User', 'admin@mint.gov.et', '$2b$10$ZUVS0YH1eeuRx/yCLavTEO0SSB7rHmNcB4zdZpSGUUDR/UxBwH4va', '0911000001', 'admin', NULL, false, true),
('Samuel Trainer', 'samuel@mint.gov.et', '$2b$10$ZUVS0YH1eeuRx/yCLavTEO0SSB7rHmNcB4zdZpSGUUDR/UxBwH4va', '0911000002', 'trainer', 1, true, true),
('Abebe Trainee', 'abebe@test.com', '$2b$10$ZUVS0YH1eeuRx/yCLavTEO0SSB7rHmNcB4zdZpSGUUDR/UxBwH4va', '0911000003', 'trainee', 1, true, true),
('Chaltu Trainee', 'chaltu@test.com', '$2b$10$ZUVS0YH1eeuRx/yCLavTEO0SSB7rHmNcB4zdZpSGUUDR/UxBwH4va', '0911000004', 'trainee', 4, true, true);

-- =============================================
-- Seed Trainer Profile
-- =============================================
INSERT INTO trainers (user_id, department_id, specialization, qualification, biography) VALUES
(2, 1, 'Full Stack Development & Cloud', 'MSc in Computer Science', 'Senior trainer with 10+ years of experience in software engineering and cloud computing.');

-- =============================================
-- Seed Trainings (course catalog per subject -> department)
-- =============================================
INSERT INTO trainings (subject_id, training_title, training_description, training_type, location_or_meeting_link, start_date, end_date, capacity, status, trainer_id, created_by) VALUES
-- Information Technology (1)
(1, 'Introduction to Cyber Security', 'Security fundamentals, threat models and defense strategies', 'Online', 'https://meet.google.com/cyb-0001-000', '2026-09-01 09:00:00', '2026-09-30 17:00:00', 30, 'open', 2, 1),
(2, 'Network Fundamentals', 'IP addressing, routing, switching and network troubleshooting', 'Hybrid', 'MinT Computer Lab, Addis Ababa', '2026-09-07 09:00:00', '2026-10-02 17:00:00', 25, 'open', NULL, 1),
(3, 'Modern Web Development', 'HTML, CSS, JavaScript and responsive front-end development', 'Online', 'https://meet.google.com/web-0002-000', '2026-10-05 09:00:00', '2026-10-30 17:00:00', 30, 'open', NULL, 1),
(4, 'Database Design & SQL', 'Relational modeling, normalization and SQL queries', 'Online', 'https://meet.google.com/db-0003-000', '2026-11-02 09:00:00', '2026-11-27 17:00:00', 30, 'open', NULL, 1),
-- Digital Technology (2)
(5, 'Introduction to Artificial Intelligence', 'Foundations of AI, search, knowledge representation and reasoning', 'Online', 'https://meet.google.com/ai-0004-000', '2026-09-01 09:00:00', '2026-09-30 17:00:00', 30, 'open', NULL, 1),
(6, 'Cloud Computing Essentials', 'Cloud service models, providers and deployment strategies', 'Online', 'https://meet.google.com/cloud-0005-000', '2026-09-14 09:00:00', '2026-10-09 17:00:00', 25, 'open', NULL, 1),
(7, 'Digital Transformation Leadership', 'Digital strategy, change management and innovation leadership', 'Offline', 'MinT Training Center, Addis Ababa', '2026-10-12 09:00:00', '2026-11-06 17:00:00', 20, 'open', NULL, 1),
-- Computer Science (3)
(8, 'Programming Fundamentals', 'Programming logic, variables, control flow and functions', 'Online', 'https://meet.google.com/prog-0006-000', '2026-09-01 09:00:00', '2026-09-30 17:00:00', 30, 'open', NULL, 1),
(9, 'Algorithms & Data Structures', 'Sorting, searching, complexity and core data structures', 'Online', 'https://meet.google.com/alg-0007-000', '2026-09-21 09:00:00', '2026-10-16 17:00:00', 30, 'open', NULL, 1),
(10, 'Software Engineering Practices', 'SDLC, agile methods, testing and software project management', 'Offline', 'MinT Computer Lab, Addis Ababa', '2026-10-12 09:00:00', '2026-11-06 17:00:00', 20, 'open', NULL, 1),
-- Data Science (4)
(11, 'Applied Statistics', 'Descriptive and inferential statistics, probability and hypothesis testing', 'Online', 'https://meet.google.com/stats-0008-000', '2026-09-01 09:00:00', '2026-09-30 17:00:00', 30, 'open', NULL, 1),
(12, 'Machine Learning Bootcamp', 'Supervised and unsupervised learning with scikit-learn', 'Online', 'https://meet.google.com/ml-0009-000', '2026-09-14 09:00:00', '2026-10-09 17:00:00', 25, 'open', NULL, 1),
(13, 'Data Analysis with Python', 'Data cleaning, EDA and visualization with pandas', 'Hybrid', 'MinT Computer Lab, Addis Ababa', '2026-05-04 09:00:00', '2026-05-29 17:00:00', 25, 'completed', NULL, 1);

-- =============================================
-- Seed Training Requests (enrollment workflow demo)
-- =============================================
INSERT INTO training_requests (training_id, trainee_id, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason) VALUES
(1, 3, 'approved', 1, CURRENT_TIMESTAMP, NULL, NULL, NULL),
(2, 3, 'rejected', NULL, NULL, 1, CURRENT_TIMESTAMP, 'Required prerequisites not met'),
(3, 3, 'pending', NULL, NULL, NULL, NULL, NULL),
(11, 4, 'pending', NULL, NULL, NULL, NULL, NULL),
(12, 4, 'approved', 1, CURRENT_TIMESTAMP, NULL, NULL, NULL),
(13, 4, 'completed', 1, CURRENT_TIMESTAMP, NULL, NULL, NULL);

-- =============================================
-- Seed Attendance
-- =============================================
INSERT INTO attendance (training_id, trainee_id, attendance_date, attendance_status, marked_by) VALUES
(13, 4, CURRENT_DATE, 'present', 2);

-- =============================================
-- Seed Certificates
-- =============================================
INSERT INTO certificates (training_id, trainee_id, certificate_number, issue_date) VALUES
(13, 4, 'MINT-2026-001', CURRENT_DATE);
