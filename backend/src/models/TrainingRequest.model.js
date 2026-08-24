const { query } = require('../config/database');

class TrainingRequest {
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

  static async getByTrainee(traineeId) {
    const result = await query(
      `SELECT tr.*,
              t.training_title, t.start_date, t.end_date, t.training_type, t.status AS training_status,
              t.id AS training_id,
              s.name AS subject_name,
              d.name AS department_name
       FROM training_requests tr
       JOIN trainings t ON tr.training_id = t.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE tr.trainee_id = $1
       ORDER BY tr.requested_at DESC`,
      [traineeId]
    );
    return result.rows;
  }

  static async getByTraining(trainingId) {
    const result = await query(
      `SELECT tr.*, u.full_name, u.email, u.phone
       FROM training_requests tr
       JOIN users u ON tr.trainee_id = u.id
       WHERE tr.training_id = $1
       ORDER BY tr.requested_at DESC`,
      [trainingId]
    );
    return result.rows;
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
      conditions.push(`(d.id = $${values.length + 1} OR t.is_all_departments = true)`);
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
             t.training_title, t.training_type, t.start_date, t.end_date, t.is_all_departments,
             u.full_name AS trainee_name, u.email AS trainee_email, u.phone AS trainee_phone,
             d.id AS department_id, d.name AS department_name,
             s.name AS subject_name,
             ap.full_name AS approved_by_name,
             rj.full_name AS rejected_by_name
      FROM training_requests tr
      JOIN trainings t ON tr.training_id = t.id
      JOIN users u ON tr.trainee_id = u.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN users ap ON tr.approved_by = ap.id
      LEFT JOIN users rj ON tr.rejected_by = rj.id
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
              t.location_or_meeting_link, t.capacity,
              s.name AS subject_name,
              d.name AS department_name,
              u.full_name AS trainee_name, u.email AS trainee_email, u.phone AS trainee_phone,
              ap.full_name AS approved_by_name,
              rj.full_name AS rejected_by_name
       FROM training_requests tr
       JOIN trainings t ON tr.training_id = t.id
       JOIN users u ON tr.trainee_id = u.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN users ap ON tr.approved_by = ap.id
       LEFT JOIN users rj ON tr.rejected_by = rj.id
       WHERE tr.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async approve(id, adminId) {
    const result = await query(
      `UPDATE training_requests
       SET status = 'approved', approved_by = $2, approved_at = CURRENT_TIMESTAMP,
           rejected_by = NULL, rejected_at = NULL, rejection_reason = NULL
       WHERE id = $1
       RETURNING *`,
      [id, adminId]
    );
    return result.rows[0] || null;
  }

  static async reject(id, adminId, reason) {
    const result = await query(
      `UPDATE training_requests
       SET status = 'rejected', rejected_by = $2, rejected_at = CURRENT_TIMESTAMP, rejection_reason = $3
       WHERE id = $1
       RETURNING *`,
      [id, adminId, reason || null]
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
