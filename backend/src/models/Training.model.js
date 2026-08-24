const { query } = require('../config/database');

class Training {
  static async create(trainingData) {
    const result = await query(
      `INSERT INTO trainings
       (subject_id, is_all_departments, trainer_id, training_title, training_description, training_type,
        location_or_meeting_link, start_date, end_date, capacity, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        trainingData.subject_id,
        trainingData.is_all_departments === true || trainingData.is_all_departments === 'true',
        trainingData.trainer_id || null,
        trainingData.training_title,
        trainingData.training_description || null,
        trainingData.training_type || 'Online',
        trainingData.location_or_meeting_link || null,
        trainingData.start_date,
        trainingData.end_date,
        trainingData.capacity || 0,
        trainingData.status || 'draft',
        trainingData.created_by || null
      ]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await query(
      `SELECT t.*,
              s.name AS subject_name,
              d.name AS department_name,
              u.full_name AS trainer_name,
              COUNT(DISTINCT tr.trainee_id) AS current_participants
       FROM trainings t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN users u ON t.trainer_id = u.id
       LEFT JOIN training_requests tr ON tr.training_id = t.id
       GROUP BY t.id, s.name, d.name, u.full_name
       ORDER BY t.start_date DESC`
    );
    return result.rows;
  }

  static async getAvailable() {
    const result = await query(
      `SELECT t.*,
              s.name AS subject_name,
              d.name AS department_name,
              u.full_name AS trainer_name,
              (SELECT COUNT(*) FROM training_requests tr
               WHERE tr.training_id = t.id AND tr.status IN ('approved', 'completed')) AS approved_count
       FROM trainings t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN users u ON t.trainer_id = u.id
       WHERE t.status = 'open'
       ORDER BY t.start_date ASC`
    );
    return result.rows;
  }

  // Trainings visible to a trainee: status = open AND (subject belongs to the
  // trainee's department OR the training is open to all departments).
  // Includes the trainee's own request status for each training.
  static async getByDepartment(departmentId, traineeId) {
    const result = await query(
      `SELECT t.*,
              s.name AS subject_name,
              d.name AS department_name,
              u.full_name AS trainer_name,
              (SELECT COUNT(*) FROM training_requests tr
               WHERE tr.training_id = t.id AND tr.status IN ('approved', 'completed')) AS approved_count,
              (SELECT tr.status FROM training_requests tr
               WHERE tr.training_id = t.id AND tr.trainee_id = $2
               ORDER BY tr.id DESC LIMIT 1) AS my_status
       FROM trainings t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN users u ON t.trainer_id = u.id
       WHERE t.status = 'open' AND (t.is_all_departments = true OR s.department_id = $1)
       GROUP BY t.id, s.name, d.name, u.full_name
       ORDER BY t.start_date ASC`,
      [departmentId, traineeId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT t.*,
              s.name AS subject_name,
              d.name AS department_name,
              d.id AS department_id,
              u.full_name AS trainer_name,
              (SELECT COUNT(*) FROM training_requests tr
               WHERE tr.training_id = t.id AND tr.status IN ('approved', 'completed')) AS approved_count
       FROM trainings t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN users u ON t.trainer_id = u.id
       WHERE t.id = $1
       GROUP BY t.id, s.name, d.id, d.name, u.full_name`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async update(id, trainingData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'subject_id', 'is_all_departments', 'trainer_id', 'training_title', 'training_description', 'training_type',
      'location_or_meeting_link', 'start_date', 'end_date', 'capacity', 'status'
    ];

    for (const field of allowedFields) {
      if (trainingData[field] !== undefined) {
        let value = trainingData[field];
        if (value === '') {
          value = null;
        }
        fields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE trainings SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id) {
    const result = await query('DELETE FROM trainings WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }

  static async getByTrainer(trainerId) {
    const result = await query(
      `SELECT t.*,
              s.name AS subject_name,
              d.name AS department_name,
              (SELECT COUNT(*) FROM training_requests tr
               WHERE tr.training_id = t.id AND tr.status IN ('approved', 'completed')) AS approved_count
       FROM trainings t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE t.trainer_id = $1
       GROUP BY t.id, s.name, d.name
       ORDER BY t.start_date DESC`,
      [trainerId]
    );
    return result.rows;
  }
}

module.exports = Training;
