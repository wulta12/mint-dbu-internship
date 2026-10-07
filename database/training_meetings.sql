-- =============================================
-- Live meetings (Zoom) for EXISTING trainings.
--
-- This feature deliberately does NOT introduce a new
-- training type. A meeting always hangs off an
-- existing row in `trainings`, so a training keeps
-- its own Online/Offline/Hybrid type and its own
-- learning / assessment / certificate workflow.
--
-- A training can have MANY meetings (Live Session 1,
-- Live Session 2, ...), which is why this is a
-- separate child table rather than a column on
-- `trainings`.
--
-- Access to a meeting link is gated on the EXISTING
-- enrollment lifecycle (training_requests.status =
-- 'approved'/'completed'). Learning progress,
-- attendance, assessment and certificates are all
-- stored separately and are never derived from a
-- meeting row.
-- =============================================

CREATE TABLE IF NOT EXISTS training_meetings (
    id            SERIAL PRIMARY KEY,
    training_id   INTEGER NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    -- Only Zoom is supported. Kept as a column so the
    -- platform is explicit data rather than implied by
    -- the link, without widening `trainings.training_type`.
    platform      VARCHAR(30)  NOT NULL DEFAULT 'zoom',
    -- Zoom join URLs carry long ?pwd= query strings,
    -- so this is wider than the 255 char column on
    -- trainings.
    meeting_link  VARCHAR(1000) NOT NULL,
    meeting_date  DATE         NOT NULL,
    start_time    TIME         NOT NULL,
    end_time      TIME         NOT NULL,
    created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT training_meetings_platform_check
        CHECK (platform = 'zoom'),
    CONSTRAINT training_meetings_time_order_check
        CHECK (end_time > start_time),
    CONSTRAINT training_meetings_title_check
        CHECK (char_length(trim(title)) > 0),
    CONSTRAINT training_meetings_link_check
        CHECK (char_length(trim(meeting_link)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_training_meetings_training
    ON training_meetings (training_id, meeting_date, start_time);

CREATE INDEX IF NOT EXISTS idx_training_meetings_date
    ON training_meetings (meeting_date);

DROP TRIGGER IF EXISTS trg_training_meetings_updated ON training_meetings;
CREATE TRIGGER trg_training_meetings_updated
    BEFORE UPDATE ON training_meetings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Attendance for a single live meeting.
--
-- Deliberately NOT folded into the existing
-- `attendance` table: that table is keyed on
-- (training_id, trainee_id, attendance_date), which
-- cannot represent two meetings on the same day and
-- carries no meeting dimension. Meeting attendance
-- is a separate record so it can never be mistaken
-- for course completion.
-- =============================================

CREATE TABLE IF NOT EXISTS meeting_attendance (
    id          SERIAL PRIMARY KEY,
    meeting_id  INTEGER NOT NULL REFERENCES training_meetings(id) ON DELETE CASCADE,
    trainee_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'present',
    marked_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT meeting_attendance_status_check
        CHECK (status IN ('present', 'absent', 'late', 'excused')),
    -- One record per trainee per meeting.
    CONSTRAINT uq_meeting_attendance UNIQUE (meeting_id, trainee_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting
    ON meeting_attendance (meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_trainee
    ON meeting_attendance (trainee_id);

DROP TRIGGER IF EXISTS trg_meeting_attendance_updated ON meeting_attendance;
CREATE TRIGGER trg_meeting_attendance_updated
    BEFORE UPDATE ON meeting_attendance
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();