-- =============================================
-- MinT Training System - Learning Management (LMS) Feature
--
-- Run against an EXISTING database:
--   psql -U postgres -d mint_training_system -f database/lms.sql
-- or
--   node backend/migrate-lms.js
--
-- (For a fresh install, database/schema.sql already includes all of this.)
-- =============================================

-- =============================================
-- Training Modules (a training is organised into modules)
-- =============================================
CREATE TABLE IF NOT EXISTS training_modules (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_modules_training ON training_modules(training_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_position ON training_modules(training_id, position);

DROP TRIGGER IF EXISTS trg_training_modules_updated ON training_modules;
CREATE TRIGGER trg_training_modules_updated
BEFORE UPDATE ON training_modules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Lessons / Learning Activities
--
-- type:
--   text     -> free-form text content read by the trainee
--   video    -> video_url (streamed / embedded), 80% watch required by default
--   pdf      -> uploaded PDF, trainee must access it
--   document -> uploaded document (Word/PPT/Excel/etc.), trainee must access it
--   link     -> external URL, trainee must access it
--
-- is_required = true activities count toward training progress.
-- =============================================
CREATE TABLE IF NOT EXISTS lessons (
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

CREATE INDEX IF NOT EXISTS idx_lessons_training ON lessons(training_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_position ON lessons(training_id, position);

DROP TRIGGER IF EXISTS trg_lessons_updated ON lessons;
CREATE TRIGGER trg_lessons_updated
BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Trainee Progress (per lesson, persisted in DB)
--
-- status: in_progress / completed
-- last_video_position: fraction 0..1 of the video watched (for resume + 80% rule)
-- =============================================
CREATE TABLE IF NOT EXISTS trainee_progress (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    trainee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed')),
    last_video_position REAL DEFAULT 0,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Set only when a trainee personally confirms watching a video whose
    -- provider cannot report playback progress (never automatically).
    video_attested_at TIMESTAMP,
    video_attested_reason VARCHAR(255),
    UNIQUE (training_id, trainee_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_trainee_progress_trainee ON trainee_progress(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_progress_training ON trainee_progress(training_id);

-- =============================================
-- Assessments (one final assessment per training)
-- pass_score: minimum percent required to pass
-- =============================================
CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    training_id INT NOT NULL UNIQUE REFERENCES trainings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    pass_score INT DEFAULT 70,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_assessments_updated ON assessments;
CREATE TRIGGER trg_assessments_updated
BEFORE UPDATE ON assessments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Assessment Questions (multiple choice A-D)
-- =============================================
CREATE TABLE IF NOT EXISTS assessment_questions (
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

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id);

-- =============================================
-- Assessment Attempts (score + answers persisted)
-- =============================================
CREATE TABLE IF NOT EXISTS assessment_attempts (
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

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_trainee ON assessment_attempts(trainee_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_training ON assessment_attempts(training_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);

-- =============================================
-- Certificates: add a verification code for QR / verification
-- =============================================
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS verification_code VARCHAR(100) UNIQUE;

-- =============================================
-- Seed demo learning content.
--
-- This is optional demo data for the "php" training (id 20) so the
-- learning flow can be tested immediately. Remove this section if you do
-- not want demo content. Guarded so re-running the migration does not
-- duplicate rows.
-- =============================================
DO $$
DECLARE
  demo_training_id INT := 20;
  has_modules BOOLEAN;
  has_assessment BOOLEAN;
  assessment_id_val INT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM training_modules WHERE training_id = demo_training_id) INTO has_modules;
  SELECT EXISTS(SELECT 1 FROM assessments WHERE training_id = demo_training_id) INTO has_assessment;

  IF NOT has_modules THEN
    INSERT INTO training_modules (training_id, title, description, position) VALUES
    (demo_training_id, 'PHP Fundamentals', 'Syntax, variables and control flow', 1),
    (demo_training_id, 'Intermediate PHP', 'Functions, arrays and working with data', 2),
    (demo_training_id, 'Practical PHP', 'Databases, forms and security best practices', 3);

    INSERT INTO lessons (module_id, training_id, title, type, content, video_url, file_name, file_path, file_size, file_type, external_url, is_required, is_published, position)
    SELECT m.id, demo_training_id, v.title, v.type, v.content, v.video_url, v.file_name, v.file_path, v.file_size, v.file_type, v.external_url, true, true, v.mpos
    FROM training_modules m
    JOIN (VALUES
      ('PHP Fundamentals', 1, 'What is PHP?', 'text', 'PHP is a widely-used open source scripting language especially suited for web development. It runs on the server, generating dynamic HTML that is then sent to the browser.', NULL, NULL, NULL, 0, NULL, NULL),
      ('PHP Fundamentals', 1, 'Variables & Data Types', 'text', 'PHP variables start with a $ sign (e.g. $name). Core data types include strings, integers, floats, booleans, arrays and objects. PHP is loosely typed, so the engine converts values automatically when needed.', NULL, NULL, NULL, 0, NULL, NULL),
      ('PHP Fundamentals', 1, 'Control Structures', 'text', 'if/else, switch, for, foreach and while let you control the flow of your scripts. foreach is the idiomatic way to iterate over arrays in PHP.', NULL, NULL, NULL, 0, NULL, NULL),
      ('Intermediate PHP', 1, 'Functions', 'text', 'Functions let you reuse code. A function is declared with the function keyword, can accept parameters, and can return a value. PHP also supports default parameter values and variadic parameters.', NULL, NULL, NULL, 0, NULL, NULL),
      ('Intermediate PHP', 1, 'Arrays in PHP', 'text', 'PHP arrays are ordered maps. They can be indexed or associative. Common operations include array_push, array_merge, sort, and iterating with foreach.', NULL, NULL, NULL, 0, NULL, NULL),
      ('Intermediate PHP', 1, 'Working with Forms', 'video', NULL, 'https://www.w3schools.com/html/mov_bbb.mp4', NULL, NULL, 0, NULL, NULL),
      ('Intermediate PHP', 1, 'PHP Language Reference', 'pdf', NULL, NULL, 'PHP Language Reference.pdf', 'lesson-demo-php-reference.pdf', 204800, 'application/pdf', NULL),
      ('Practical PHP', 1, 'Connecting to a Database', 'text', 'PHP connects to MySQL/PostgreSQL using PDO (recommended) or mysqli. PDO supports prepared statements which protect against SQL injection.', NULL, NULL, NULL, 0, NULL, NULL),
      ('Practical PHP', 1, 'Security Best Practices', 'text', 'Always use prepared statements, escape output (htmlspecialchars), validate input, hash passwords with password_hash(), and set secure session cookies.', NULL, NULL, NULL, 0, NULL, NULL),
      ('Practical PHP', 1, 'PHP Security Cheat Sheet', 'document', NULL, NULL, 'PHP Security Cheat Sheet.docx', 'lesson-demo-php-security.docx', 16384, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', NULL)
    ) AS v(module_title, mpos, title, type, content, video_url, file_name, file_path, file_size, file_type, external_url)
    ON m.title = v.module_title;
  END IF;

  IF NOT has_assessment THEN
    INSERT INTO assessments (training_id, title, description, pass_score, is_published)
    VALUES (demo_training_id, 'PHP Final Assessment', 'Complete at least 75% of the training to unlock. You need 70% to pass.', 70, true)
    RETURNING id INTO assessment_id_val;

    INSERT INTO assessment_questions (assessment_id, question_text, option_a, option_b, option_c, option_d, correct_answer, position) VALUES
    (assessment_id_val, 'Which symbol starts a PHP variable?', '&', '#', '$', '@', 'C', 1),
    (assessment_id_val, 'Which of these is used to connect to databases securely in PHP?', 'PDO with prepared statements', 'eval()', 'file_put_contents', 'echo', 'A', 2),
    (assessment_id_val, 'How do you output text to the browser in PHP?', 'print_to_screen', 'echo', 'console.log', 'document.write', 'B', 3),
    (assessment_id_val, 'Which function securely hashes a password in PHP?', 'md5()', 'sha1()', 'password_hash()', 'base64_encode()', 'C', 4),
    (assessment_id_val, 'What does the foreach loop do?', 'Loops while a condition is true', 'Iterates over each element of an array', 'Loops forever', 'Terminates the script', 'B', 5),
    (assessment_id_val, 'Which of these protects against SQL injection?', 'Concatenating user input into SQL', 'Prepared statements', 'Disabling the database', 'Using GET requests', 'B', 6),
    (assessment_id_val, 'PHP code is executed on...', 'The client browser', 'The web server', 'The database server', 'The DNS server', 'B', 7),
    (assessment_id_val, 'Which function escapes output to prevent XSS?', 'htmlspecialchars()', 'include()', 'session_start()', 'exit()', 'A', 8);
  END IF;
END $$;
