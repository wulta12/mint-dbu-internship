const { query } = require('../config/database');

class TrainingRequest {
  // Single source of truth for "has this trainee finished this training?".
  //
  // The stored `status` alone cannot answer that: it only becomes 'completed'
  // when a certificate is issued or an admin marks it by hand, so a trainee who
  // finished every required lesson or earned a certificate would otherwise be
  // reported as unfinished. Every trainer and trainee view must agree on this,
  // so both getByTrainee and getByTraining derive their `is_completed` here
  // rather than each keeping its own copy of the rule.
  //
  // Expects a row that carries `status`, `has_certificate`, `required_lessons`
  // and `done_lessons` (as produced by the completion queries below).
  static computeCompletion(row) {
    const requiredLessons = parseInt(row.required_lessons, 10) || 0;
    const doneLessons = parseInt(row.done_lessons, 10) || 0;
    const isCompleted =
      row.status === 'completed' ||
      row.has_certificate === true ||
      (requiredLessons > 0 && doneLessons >= requiredLessons);

    return {
      required_lessons: requiredLessons,
      done_lessons: doneLessons,
      progress_percent:
        requiredLessons === 0 ? 0 : Math.round((doneLessons / requiredLessons) * 100),
      is_completed: isCompleted
    };
  }

  // Trainee submits a request. Always created with status = 'pending'.
  static async request(trainingId, traineeId) {
    const result = await query(
      `INSERT INTO training_requests (training_id, trainee_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [trainingId, traineeId]
    );
    return result.rows[0];
  }

  // Returns true when the trainee already has an active (pending/approved) request
  // for the training. Rejected/completed requests do NOT block re-requesting.
  static async hasActiveRequest(trainingId, traineeId) {
    const result = await query(
      `SELECT id FROM training_requests
       WHERE training_id = $1 AND trainee_id = $2 AND status IN ('pending', 'approved')`,
      [trainingId, traineeId]
    );
    return result.rows.length > 0;
  }

  // A trainee's requests with training details, plus real lesson progress.
  //
  // The stored status alone says only "approved"/"completed", so a trainee who
  // had finished the content but whose enrollment had not been flagged still
  // looked unfinished everywhere this list is shown. `is_completed` and
  // `progress_percent` describe what actually happened.
  static async getByTrainee(traineeId) {
    const result = await query(
      `SELECT tr.*,
              t.training_title, t.start_date, t.end_date, t.training_type, t.status AS training_status,
              t.id AS training_id,
              s.name AS subject_name,
              d.name AS department_name,
              COALESCE(req.total, 0) AS required_lessons,
              COALESCE(done.done, 0) AS done_lessons,
              EXISTS (
                 SELECT 1 FROM certificates c
                 WHERE c.trainee_id = tr.trainee_id
                   AND c.training_id = tr.training_id
                   AND c.status = 'valid'
              ) AS has_certificate
       FROM training_requests tr
       JOIN trainings t ON tr.training_id = t.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN (
         SELECT l.training_id, COUNT(*)::int AS total
         FROM lessons l
         WHERE l.is_published = true AND l.is_required = true
         GROUP BY l.training_id
       ) req ON req.training_id = tr.training_id
       LEFT JOIN (
         SELECT tp.training_id, COUNT(*)::int AS done
         FROM trainee_progress tp
         JOIN lessons l ON l.id = tp.lesson_id
         WHERE tp.trainee_id = $1
           AND tp.status = 'completed'
           AND l.is_published = true AND l.is_required = true
         GROUP BY tp.training_id
       ) done ON done.training_id = tr.training_id
       WHERE tr.trainee_id = $1
       ORDER BY tr.requested_at DESC`,
      [traineeId]
    );

    return result.rows.map((row) => ({
      ...row,
      ...TrainingRequest.computeCompletion(row)
    }));
  }

  static async getByTraining(trainingId) {
    const result = await query(
      `SELECT tr.*,
              u.full_name, u.email, u.phone,
              COALESCE(req.total, 0) AS required_lessons,
              COALESCE(done.done, 0) AS done_lessons,
              EXISTS (
                 SELECT 1 FROM certificates c
                 WHERE c.trainee_id = tr.trainee_id
                   AND c.training_id = tr.training_id
                   AND c.status = 'valid'
              ) AS has_certificate
       FROM training_requests tr
       JOIN users u ON tr.trainee_id = u.id
       LEFT JOIN (
         SELECT l.training_id, COUNT(*)::int AS total
         FROM lessons l
         WHERE l.is_published = true AND l.is_required = true
           AND l.training_id = $1
         GROUP BY l.training_id
       ) req ON req.training_id = tr.training_id
       LEFT JOIN (
         SELECT tp.trainee_id, tp.training_id, COUNT(*)::int AS done
         FROM trainee_progress tp
         JOIN lessons l ON l.id = tp.lesson_id
         WHERE tp.training_id = $1
           AND tp.status = 'completed'
           AND l.is_published = true AND l.is_required = true
         GROUP BY tp.trainee_id, tp.training_id
       ) done ON done.trainee_id = tr.trainee_id AND done.training_id = tr.training_id
       WHERE tr.training_id = $1
       ORDER BY tr.requested_at DESC`,
      [trainingId]
    );

    return result.rows.map((row) => ({
      ...row,
      ...TrainingRequest.computeCompletion(row)
    }));
  }

  // Every trainee who has genuinely finished one of this trainer's trainings,
  // across all of the trainer's assigned trainings.
  //
  // This is the single source of truth behind both the Trainer Dashboard
  // "Completed" card and the list its drill-down opens. Rows are filtered with
  // the same computeCompletion rule as getByTrainee/getByTraining, so a trainee
  // only appears once all published+required lessons are done (or a valid
  // certificate / stored 'completed' status says so) - starting the course or
  // merely passing the assessment is never enough.
  static async getCompletedByTrainer(trainerId) {
    const result = await query(
      `SELECT tr.id,
              tr.trainee_id,
              tr.status,
              tr.requested_at,
              tr.approved_at,
              u.full_name,
              u.email,
              t.id AS training_id,
              t.training_title,
              t.training_type,
              COALESCE(req.total, 0) AS required_lessons,
              COALESCE(done.done, 0) AS done_lessons,
              EXISTS (
                 SELECT 1 FROM certificates c
                 WHERE c.trainee_id = tr.trainee_id
                   AND c.training_id = tr.training_id
                   AND c.status = 'valid'
              ) AS has_certificate,
              (
                 SELECT MAX(c.issue_date) FROM certificates c
                 WHERE c.trainee_id = tr.trainee_id
                   AND c.training_id = tr.training_id
                   AND c.status = 'valid'
              ) AS certificate_issued_at,
              EXISTS (
                 SELECT 1 FROM assessments a
                 WHERE a.training_id = tr.training_id AND a.is_published = true
              ) AS assessment_exists,
              EXISTS (
                 SELECT 1 FROM assessment_attempts aa
                 WHERE aa.training_id = tr.training_id
                   AND aa.trainee_id = tr.trainee_id
                   AND aa.passed = true
              ) AS assessment_passed,
              (
                 SELECT MAX(aa.submitted_at) FROM assessment_attempts aa
                 WHERE aa.training_id = tr.training_id
                   AND aa.trainee_id = tr.trainee_id
                   AND aa.passed = true
              ) AS assessment_passed_at,
              (
                 SELECT MAX(aa.score) FROM assessment_attempts aa
                 WHERE aa.training_id = tr.training_id
                   AND aa.trainee_id = tr.trainee_id
              ) AS assessment_best_score
       FROM training_requests tr
       JOIN trainings t ON tr.training_id = t.id
       JOIN users u ON tr.trainee_id = u.id
       LEFT JOIN (
         SELECT l.training_id, COUNT(*)::int AS total
         FROM lessons l
         WHERE l.is_published = true AND l.is_required = true
         GROUP BY l.training_id
       ) req ON req.training_id = tr.training_id
       LEFT JOIN (
         SELECT tp.trainee_id, tp.training_id, COUNT(*)::int AS done
         FROM trainee_progress tp
         JOIN lessons l ON l.id = tp.lesson_id
         WHERE tp.status = 'completed'
           AND l.is_published = true AND l.is_required = true
         GROUP BY tp.trainee_id, tp.training_id
       ) done ON done.trainee_id = tr.trainee_id AND done.training_id = tr.training_id
       WHERE t.trainer_id = $1
         AND tr.status IN ('approved', 'completed')
       ORDER BY t.training_title ASC, u.full_name ASC`,
      [trainerId]
    );

    return result.rows
      .map((row) => ({
        ...row,
        ...TrainingRequest.computeCompletion(row)
      }))
      .filter((row) => row.is_completed);
  }

  // Admin request queue with optional filters.
  static async getAll(filters = {}) {
    const conditions = [];
    const values = [];

    if (filters.status) {
      conditions.push(`tr.status = $${values.length + 1}`);
      values.push(filters.status);
    }
    if (filters.department_id) {
      conditions.push(
        `(t.is_all_departments = true
          OR EXISTS (SELECT 1 FROM training_departments td
                     WHERE td.training_id = t.id AND td.department_id = $${values.length + 1})
          OR (NOT EXISTS (SELECT 1 FROM training_departments td2
                          WHERE td2.training_id = t.id) AND d.id = $${values.length + 1}))`
      );
      values.push(filters.department_id);
    }
    if (filters.training_id) {
      conditions.push(`t.id = $${values.length + 1}`);
      values.push(filters.training_id);
    }
    if (filters.search) {
      conditions.push(`(u.full_name ILIKE $${values.length + 1} OR u.email ILIKE $${values.length + 1} OR t.training_title ILIKE $${values.length + 1})`);
      values.push(`%${filters.search}%`);
    }

    let sql = `
      SELECT tr.id, tr.training_id, tr.trainee_id, tr.status, tr.requested_at,
             tr.approved_by, tr.approved_at, tr.rejected_by, tr.rejected_at, tr.rejection_reason,
             tr.cancelled_by, tr.cancelled_at,
             t.training_title, t.training_type, t.start_date, t.end_date, t.is_all_departments,
             u.full_name AS trainee_name, u.email AS trainee_email, u.phone AS trainee_phone,
             d.id AS department_id, d.name AS department_name,
             s.name AS subject_name,
             ap.full_name AS approved_by_name,
             rj.full_name AS rejected_by_name,
             cl.full_name AS cancelled_by_name
      FROM training_requests tr
      JOIN trainings t ON tr.training_id = t.id
      JOIN users u ON tr.trainee_id = u.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN users ap ON tr.approved_by = ap.id
      LEFT JOIN users rj ON tr.rejected_by = rj.id
      LEFT JOIN users cl ON tr.cancelled_by = cl.id
    `;

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY tr.requested_at DESC';

    const result = await query(sql, values);
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT tr.*,
              t.training_title, t.training_description, t.training_type, t.start_date, t.end_date,
              t.location_or_meeting_link, t.capacity, t.is_all_departments,
              s.name AS subject_name,
              d.name AS department_name,
              u.full_name AS trainee_name, u.email AS trainee_email, u.phone AS trainee_phone,
              ap.full_name AS approved_by_name,
              rj.full_name AS rejected_by_name,
              cl.full_name AS cancelled_by_name
       FROM training_requests tr
       JOIN trainings t ON tr.training_id = t.id
       JOIN users u ON tr.trainee_id = u.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN users ap ON tr.approved_by = ap.id
       LEFT JOIN users rj ON tr.rejected_by = rj.id
       LEFT JOIN users cl ON tr.cancelled_by = cl.id
       WHERE tr.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async approve(id, adminId) {
    const result = await query(
      `UPDATE training_requests
       SET status = 'approved', approved_by = $2, approved_at = CURRENT_TIMESTAMP,
           rejected_by = NULL, rejected_at = NULL, rejection_reason = NULL,
           cancelled_by = NULL, cancelled_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id, adminId]
    );
    return result.rows[0] || null;
  }

  static async reject(id, adminId, reason) {
    const result = await query(
      `UPDATE training_requests
       SET status = 'rejected', rejected_by = $2, rejected_at = CURRENT_TIMESTAMP, rejection_reason = $3,
           approved_by = NULL, approved_at = NULL,
           cancelled_by = NULL, cancelled_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id, adminId, reason || null]
    );
    return result.rows[0] || null;
  }

  // Trainee withdraws their own PENDING request by deleting it. Only pending
  // requests can be deleted; the caller must already have verified ownership.
  static async remove(id) {
    const result = await query(
      `DELETE FROM training_requests WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async markCompleted(id) {
    const result = await query(
      `UPDATE training_requests
       SET status = 'completed'
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  // Marks the trainee's ENROLLMENT completed, given the training + trainee
  // rather than a request id.
  //
  // Every certificate must be able to say the same thing about the enrollment
  // that produced it. Without this, a certificate auto-issued on a passed
  // assessment left the request on 'approved', so the trainee dashboard showed
  // "Certificates: 1" next to "Completed: 0" for the very same training.
  // Returns the number of rows changed (0 when nothing needed changing).
  static async markCompletedForTrainee(trainingId, traineeId) {
    const result = await query(
      `UPDATE training_requests
       SET status = 'completed'
       WHERE training_id = $1 AND trainee_id = $2 AND status = 'approved'`,
      [trainingId, traineeId]
    );
    return result.rowCount;
  }

  // Real completion state for one trainee's enrollments.
  //
  // The stored `status` alone cannot answer "has the trainee finished this?".
  // It only becomes 'completed' when a certificate is issued or an admin marks
  // it by hand, so a trainee who finished every lesson of the content saw a
  // "Completed" card reading 0 while holding a valid certificate.
  //
  // A training counts as completed when ANY of these hold:
  //   1. the enrollment status is already 'completed'
  //   2. a valid certificate exists for the training
  //   3. every published+required lesson is completed
  //
  // A training with no published+required lessons (0 of 0) is deliberately NOT
  // counted: there is nothing to finish, and calling it complete would inflate
  // the number for trainees in departments whose content is not built yet.
  static async getCompletionSummary(traineeId) {
    const result = await query(
      `WITH enrollments AS (
         SELECT tr.id,
                tr.training_id,
                tr.status,
                COALESCE(req.total, 0) AS required_lessons,
                COALESCE(done.done, 0) AS done_lessons,
                EXISTS (
                   SELECT 1 FROM certificates c
                   WHERE c.trainee_id = tr.trainee_id
                     AND c.training_id = tr.training_id
                     AND c.status = 'valid'
                ) AS has_certificate
         FROM training_requests tr
         LEFT JOIN (
           SELECT l.training_id, COUNT(*)::int AS total
           FROM lessons l
           WHERE l.is_published = true AND l.is_required = true
           GROUP BY l.training_id
         ) req ON req.training_id = tr.training_id
         LEFT JOIN (
           SELECT tp.training_id, COUNT(*)::int AS done
           FROM trainee_progress tp
           JOIN lessons l ON l.id = tp.lesson_id
           WHERE tp.trainee_id = $1
             AND tp.status = 'completed'
             AND l.is_published = true AND l.is_required = true
           GROUP BY tp.training_id
         ) done ON done.training_id = tr.training_id
         WHERE tr.trainee_id = $1
           AND tr.status IN ('approved', 'completed')
       )
       SELECT
         COUNT(*)::int AS enrolled,
         COUNT(*) FILTER (
           WHERE status = 'completed'
              OR has_certificate
              OR (required_lessons > 0 AND done_lessons >= required_lessons)
         )::int AS completed
       FROM enrollments`,
      [traineeId]
    );

    const row = result.rows[0] || {};
    return {
      enrolled: parseInt(row.enrolled, 10) || 0,
      completed: parseInt(row.completed, 10) || 0
    };
  }

  static async getEnrolledCount(trainingId) {
    const result = await query(
      `SELECT COUNT(*) AS count FROM training_requests
       WHERE training_id = $1 AND status IN ('approved', 'completed')`,
      [trainingId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  // Returns true when the trainee is actively enrolled (approved or completed)
  static async isEnrolled(trainingId, traineeId) {
    const result = await query(
      `SELECT id FROM training_requests
       WHERE training_id = $1 AND trainee_id = $2 AND status IN ('approved', 'completed')`,
      [trainingId, traineeId]
    );
    return result.rows.length > 0;
  }

  // Returns the active enrollment request for a training + trainee (approved or completed)
  static async findEnrolled(trainingId, traineeId) {
    const result = await query(
      `SELECT * FROM training_requests
       WHERE training_id = $1 AND trainee_id = $2 AND status IN ('approved', 'completed')
       LIMIT 1`,
      [trainingId, traineeId]
    );
    return result.rows[0] || null;
  }}

module.exports = TrainingRequest;
