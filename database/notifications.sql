-- =============================================
-- Migration: add the notifications table
-- Safe to run on an existing database. Does NOT
-- touch any other table, and is idempotent:
-- running it twice leaves exactly one copy of
-- each backfilled notification.
--
-- schema.sql creates this table already, but
-- schema.sql begins with DROP TABLE ... CASCADE
-- so it can only be used for a fresh install.
-- Run THIS file to add notifications to an
-- existing database.
-- =============================================

-- The backfill below must only ever run once, on the very first run that
-- creates the table. Everything is therefore wrapped in a DO block that
-- checks whether the table existed beforehand, so re-running the migration
-- cannot duplicate notifications.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) THEN
        RAISE NOTICE 'notifications already exists - skipping create and backfill';
        RETURN;
    END IF;

    CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(40) NOT NULL DEFAULT 'info',
        title VARCHAR(200) NOT NULL,
        message TEXT,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Bell feed: newest first for one user, plus the unread badge count.
    CREATE INDEX idx_notifications_user
        ON notifications(user_id, is_read, created_at DESC);

    -- Partial index keeps the unread-count query off the full feed.
    CREATE INDEX idx_notifications_user_unread
        ON notifications(user_id) WHERE is_read = false;

    -- Backfill unread contact messages, so the bell is not empty for
    -- anything already sitting in the admin inbox.
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT u.id, 'contact_message', 'New contact message',
           'From: ' || cm.name || ' (' || cm.email || ')' || E'\n'
             || 'Subject: ' || COALESCE(cm.subject, '(no subject)') || E'\n\n'
             || cm.message,
           '/admin/messages'
    FROM contact_messages cm
    CROSS JOIN users u
    WHERE u.role = 'admin' AND u.is_active = true AND cm.is_read = false;

    -- Backfill enrollment requests still awaiting a decision.
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT u.id, 'enrollment_request', 'New enrollment request',
           tr.trainee_name || ' requested "' || tr.training_title || '".' || E'\n'
             || 'Email: ' || COALESCE(tr.trainee_email, 'n/a') || E'\n'
             || 'Department: ' || COALESCE(tr.department_name, 'n/a') || E'\n'
             || 'Type: ' || COALESCE(tr.training_type, 'n/a') || E'\n'
             || 'Starts: ' || TO_CHAR(tr.start_date, 'DD/MM/YYYY') || E'\n'
             || 'Seats: ' || (
                  SELECT COUNT(*)::TEXT
                  FROM training_requests x
                  WHERE x.training_id = tr.training_id
                    AND x.status IN ('approved', 'completed')
                ) || '/' || (
                  SELECT t.capacity::TEXT FROM trainings t WHERE t.id = tr.training_id
                ) || ' filled',
           '/admin/enrollments'
    FROM (
        SELECT tr.id, tr.training_id, t.training_title, t.training_type, t.start_date,
               u.full_name AS trainee_name, u.email AS trainee_email,
               d.name AS department_name
        FROM training_requests tr
        JOIN trainings t ON tr.training_id = t.id
        JOIN users u ON tr.trainee_id = u.id
        LEFT JOIN subjects s ON t.subject_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE tr.status = 'pending'
    ) tr
    CROSS JOIN users u
    WHERE u.role = 'admin' AND u.is_active = true;

    RAISE NOTICE 'notifications created and backfilled';
END $$;
