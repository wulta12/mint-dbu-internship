const { query } = require('../config/database');

// =============================================
// Live meetings for an EXISTING training.
//
// Every meeting hangs off trainings.id. Nothing in this
// file writes to trainings, training_requests, lessons,
// trainee_progress, assessments or certificates, so the
// enrollment / learning / assessment / certificate flows
// are structurally unable to be affected by a meeting.
//
// There is NO learning-progress filter anywhere in this
// model. Access is decided by the caller (the controller)
// from the enrollment record alone.
// =============================================

// Columns safe to hand to any authenticated participant.
// The meeting_link is intentionally NOT here.
const MEETING_SUMMARY_SELECT = `
  tm.id, tm.training_id, tm.title, tm.platform,
  tm.meeting_date, tm.start_time, tm.end_time,
  tm.created_at, tm.updated_at`;

// Full row including the Zoom link. Only ever selected after
// the controller has authorised the caller.
const MEETING_FULL_SELECT = `
  ${MEETING_SUMMARY_SELECT}, tm.meeting_link, tm.created_by,
  t.training_title, u.full_name AS created_by_name`;

class TrainingMeeting {
  static async create(data) {
    const result = await query(
      `INSERT INTO training_meetings
         (training_id, title, platform, meeting_link, meeting_date, start_time, end_time, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.training_id,
        data.title,
        data.platform || 'zoom',
        data.meeting_link,
        data.meeting_date,
        data.start_time,
        data.end_time,
        data.created_by || null
      ]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT ${MEETING_FULL_SELECT}
       FROM training_meetings tm
       JOIN trainings t ON tm.training_id = t.id
       LEFT JOIN users u ON tm.created_by = u.id
       WHERE tm.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  // All meetings for a training, newest schedule last.
  // Used by admin/trainer management screens.
  static async getByTraining(trainingId) {
    const result = await query(
      `SELECT ${MEETING_SUMMARY_SELECT},
              tm.meeting_link, tm.created_by,
              t.training_title, u.full_name AS created_by_name,
              (SELECT COUNT(*) FROM meeting_attendance ma
               WHERE ma.meeting_id = tm.id) AS attendance_count
       FROM training_meetings tm
       JOIN trainings t ON tm.training_id = t.id
       LEFT JOIN users u ON tm.created_by = u.id
       WHERE tm.training_id = $1
       ORDER BY tm.meeting_date ASC, tm.start_time ASC`,
      [trainingId]
    );
    return result.rows;
  }

  // Meetings a logged-in APPROVED participant may see, with the
  // join link attached.
  //
  // `upcomingOnly` (default true) hides meetings whose date has
  // passed, which is what the trainee training page shows. The
  // full history is still reachable with upcomingOnly = false.
  //
  // The caller MUST have already verified that the trainee is an
  // approved participant; this query deliberately does not filter
  // on enrollment itself, so that authorisation lives in exactly
  // one place (the controller) and cannot drift.
  static async getForParticipant(trainingId, traineeId, { upcomingOnly = true } = {}) {
    const result = await query(
      `SELECT ${MEETING_SUMMARY_SELECT}, tm.meeting_link, t.training_title,
              (tm.meeting_date + tm.start_time) AS starts_at,
              (tm.meeting_date + tm.end_time)   AS ends_at,
              (CURRENT_TIMESTAMP BETWEEN (tm.meeting_date + tm.start_time)
                                    AND (tm.meeting_date + tm.end_time)) AS is_live,
              (tm.meeting_date + tm.end_time) < CURRENT_TIMESTAMP AS is_past,
              (ma.status IS NOT NULL) AS my_attendance_status
       FROM training_meetings tm
       JOIN trainings t ON tm.training_id = t.id
       LEFT JOIN meeting_attendance ma
              ON ma.meeting_id = tm.id AND ma.trainee_id = $2
       WHERE tm.training_id = $1
         ${upcomingOnly ? 'AND (tm.meeting_date + tm.end_time) >= CURRENT_TIMESTAMP' : ''}
       ORDER BY tm.meeting_date ASC, tm.start_time ASC`,
      [trainingId, traineeId]
    );
    return result.rows;
  }

  // The soonest meeting that has not finished yet, with the Zoom link.
  //
  // Used by the enrollment-approval email: "the trainer has already prepared
  // the meeting" means there is a scheduled session to put in the mail. Returns
  // null when nothing is scheduled yet (or everything is in the past), which is
  // the signal to send the confirmation without a Zoom card.
  //
  // meeting_link is NOT NULL, so any row returned here is joinable.
  static async getNextUpcoming(trainingId) {
    const result = await query(
      `SELECT ${MEETING_FULL_SELECT}
       FROM training_meetings tm
       JOIN trainings t ON tm.training_id = t.id
       LEFT JOIN users u ON tm.created_by = u.id
       WHERE tm.training_id = $1
         AND (tm.meeting_date + tm.end_time) >= CURRENT_TIMESTAMP
       ORDER BY tm.meeting_date ASC, tm.start_time ASC
       LIMIT 1`,
      [trainingId]
    );
    return result.rows[0] || null;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['title', 'platform', 'meeting_link', 'meeting_date', 'start_time', 'end_time'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        let value = data[field];
        if (value === '') value = null;
        fields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE training_meetings SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id) {
    const result = await query('DELETE FROM training_meetings WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }

  // Every approved participant of the meeting's training, LEFT JOINed
  // with whatever attendance has already been recorded. Trainees with
  // no row yet come back with attendance_status = null, so the
  // management screen can show the full roster and mark it in one pass.
  static async getRosterWithAttendance(meetingId) {
    const result = await query(
      `SELECT u.id AS trainee_id,
              u.full_name, u.email,
              tr.status AS enrollment_status,
              ma.id AS attendance_id,
              ma.status AS attendance_status,
              ma.marked_by,
               mu.full_name AS marked_by_name
       FROM training_meetings tm
       JOIN training_requests tr
            ON tr.training_id = tm.training_id
           AND tr.status IN ('approved', 'completed')
       JOIN users u ON u.id = tr.trainee_id
       LEFT JOIN meeting_attendance ma
              ON ma.meeting_id = tm.id AND ma.trainee_id = u.id
       LEFT JOIN users mu ON mu.id = ma.marked_by
       WHERE tm.id = $1
       ORDER BY u.full_name ASC`,
      [meetingId]
    );
    return result.rows;
  }

  // Rollup for the meeting. Note this is a MEETING figure only; it is
  // never read by certificate issuance or progress calculation.
  static async getAttendanceSummary(meetingId) {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE ma.status = 'present') AS present,
         COUNT(*) FILTER (WHERE ma.status = 'absent')  AS absent,
         COUNT(*) FILTER (WHERE ma.status = 'late')    AS late,
         COUNT(*) FILTER (WHERE ma.status = 'excused') AS excused,
         COUNT(ma.id) AS marked,
         (SELECT COUNT(*) FROM training_requests tr
          WHERE tr.training_id = (SELECT training_id FROM training_meetings WHERE id = $1)
            AND tr.status IN ('approved', 'completed')) AS approved_participants
       FROM meeting_attendance ma
       WHERE ma.meeting_id = $1`,
      [meetingId]
    );
    return result.rows[0];
  }
}

module.exports = TrainingMeeting;