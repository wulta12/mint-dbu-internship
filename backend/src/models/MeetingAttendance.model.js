const { query } = require('../config/database');

// =============================================
// Attendance for a single live meeting.
//
// Intentionally separate from the existing `attendance`
// table, which is keyed on (training_id, trainee_id,
// attendance_date) and therefore cannot represent two
// meetings on the same day.
//
// Nothing here touches trainee_progress, assessment
// attempts or certificates: recording that someone joined
// a live session can never advance their course progress
// or earn them a certificate.
// =============================================

const ALLOWED_STATUSES = ['present', 'absent', 'late', 'excused'];

class MeetingAttendance {
  // Only approved participants of the meeting's training may be
  // recorded. Returns the ids that were actually eligible so the
  // controller can report anything it refused.
  static async assertApprovedParticipants(meetingId, traineeIds) {
    if (!Array.isArray(traineeIds) || traineeIds.length === 0) return [];

    const result = await query(
      `SELECT tr.trainee_id
       FROM training_meetings tm
       JOIN training_requests tr
            ON tr.training_id = tm.training_id
           AND tr.trainee_id = ANY($2::int[])
           AND tr.status IN ('approved', 'completed')
       WHERE tm.id = $1`,
      [meetingId, traineeIds]
    );
    return result.rows.map((r) => Number(r.trainee_id));
  }

  // Insert or update attendance for one meeting in a single statement.
  // Re-submitting the same roster simply corrects earlier values.
  static async upsertBatch(meetingId, records, markedBy) {
    if (!Array.isArray(records) || records.length === 0) return [];

    const values = [];
    const params = [];
    let i = 1;
    for (const record of records) {
      values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3})`);
      params.push(meetingId, record.trainee_id, record.status, markedBy);
      i += 4;
    }

    const result = await query(
      `INSERT INTO meeting_attendance (meeting_id, trainee_id, status, marked_by)
       VALUES ${values.join(', ')}
       ON CONFLICT (meeting_id, trainee_id)
       DO UPDATE SET status = EXCLUDED.status,
                     marked_by = EXCLUDED.marked_by
       RETURNING *`,
      params
    );
    return result.rows;
  }

  static async getByMeeting(meetingId) {
    const result = await query(
      `SELECT ma.*, u.full_name, u.email
       FROM meeting_attendance ma
       JOIN users u ON ma.trainee_id = u.id
       WHERE ma.meeting_id = $1
       ORDER BY u.full_name ASC`,
      [meetingId]
    );
    return result.rows;
  }

  static async getByTrainee(traineeId) {
    const result = await query(
      `SELECT ma.*, tm.title, tm.meeting_date, tm.start_time, tm.end_time, tm.platform,
              t.training_title, t.id AS training_id
       FROM meeting_attendance ma
       JOIN training_meetings tm ON ma.meeting_id = tm.id
       JOIN trainings t ON tm.training_id = t.id
       WHERE ma.trainee_id = $1
       ORDER BY tm.meeting_date DESC, tm.start_time DESC`,
      [traineeId]
    );
    return result.rows;
  }

  static async remove(attendanceId) {
    const result = await query(
      'DELETE FROM meeting_attendance WHERE id = $1 RETURNING id',
      [attendanceId]
    );
    return result.rows[0] || null;
  }
}

MeetingAttendance.ALLOWED_STATUSES = ALLOWED_STATUSES;

module.exports = MeetingAttendance;