const { query } = require('../config/database');

class Attendance {
  static async getByTraining(trainingId) {
    const result = await query(
      `SELECT a.*, u.full_name, u.email
       FROM attendance a
       JOIN users u ON a.trainee_id = u.id
       WHERE a.training_id = $1
       ORDER BY a.attendance_date DESC`,
      [trainingId]
    );
    return result.rows;
  }

  static async getByTrainingAndDate(trainingId, attendanceDate) {
    const result = await query(
      `SELECT a.*, u.full_name, u.email
       FROM attendance a
       JOIN users u ON a.trainee_id = u.id
       WHERE a.training_id = $1 AND a.attendance_date = $2
       ORDER BY u.full_name ASC`,
      [trainingId, attendanceDate]
    );
    return result.rows;
  }

  static async getDatesByTraining(trainingId) {
    const result = await query(
      `SELECT DISTINCT attendance_date
       FROM attendance
       WHERE training_id = $1
       ORDER BY attendance_date DESC`,
      [trainingId]
    );
    return result.rows.map((r) => r.attendance_date);
  }

  static async getSummaryByTraining(trainingId) {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE attendance_status = 'present') AS present,
         COUNT(*) FILTER (WHERE attendance_status = 'absent') AS absent,
         COUNT(*) FILTER (WHERE attendance_status = 'late') AS late,
         COUNT(*) FILTER (WHERE attendance_status = 'excused') AS excused,
         COUNT(DISTINCT attendance_date) AS session_count
       FROM attendance
       WHERE training_id = $1`,
      [trainingId]
    );
    return result.rows[0];
  }

  static async getByTrainee(traineeId) {
    const result = await query(
      `SELECT a.*, t.training_title
       FROM attendance a
       JOIN trainings t ON a.training_id = t.id
       WHERE a.trainee_id = $1
       ORDER BY a.attendance_date DESC`,
      [traineeId]
    );
    return result.rows;
  }

  static async create(data) {
    const result = await query(
      `INSERT INTO attendance (training_id, trainee_id, attendance_date, attendance_status, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.training_id, data.trainee_id, data.attendance_date, data.attendance_status || 'present', data.marked_by]
    );
    return result.rows[0];
  }

  // Bulk upsert for a given session date. Existing rows are updated.
  static async upsertBatch(trainingId, attendanceDate, records, markedBy) {
    if (!records || records.length === 0) return [];
    const values = [];
    const params = [];
    let i = 1;
    for (const record of records) {
      values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4})`);
      params.push(trainingId, record.trainee_id, attendanceDate, record.status || 'present', markedBy);
      i += 5;
    }
    const result = await query(
      `INSERT INTO attendance (training_id, trainee_id, attendance_date, attendance_status, marked_by)
       VALUES ${values.join(', ')}
       ON CONFLICT (training_id, trainee_id, attendance_date)
       DO UPDATE SET attendance_status = EXCLUDED.attendance_status, marked_by = EXCLUDED.marked_by
       RETURNING *`,
      params
    );
    return result.rows;
  }
}

module.exports = Attendance;
