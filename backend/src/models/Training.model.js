const { query, pool } = require('../config/database');

class Training {
  // Explicit department assignments (training_departments join table).
  // Returns an array of department ids assigned to the training.
  static async getAssignedDepartments(trainingId) {
    const result = await query(
      `SELECT department_id FROM training_departments WHERE training_id = $1`,
      [trainingId]
    );
    return result.rows.map(r => r.department_id);
  }

  // Returns true when the given department may access this training:
  //   - all departments        -> everyone
  //   - explicit assignment    -> ONLY the assigned departments
  //   - no explicit assignment -> the subject's department (legacy)
  static async isDepartmentAllowed(training, departmentId) {
    if (!departmentId) return false;
    if (training.is_all_departments) return true;

    const assigned = await Training.getAssignedDepartments(training.id);
    if (assigned.length > 0) return assigned.includes(Number(departmentId));

    return Number(training.department_id) === Number(departmentId);
  }

  // Replaces the explicit department assignments for a training (atomic).
  static async setDepartmentAssignments(trainingId, departmentIds) {
    const ids = Array.isArray(departmentIds)
      ? [...new Set(departmentIds.filter(Boolean).map(Number))]
      : [];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM training_departments WHERE training_id = $1', [trainingId]);
      for (const departmentId of ids) {
        await client.query(
          'INSERT INTO training_departments (training_id, department_id) VALUES ($1, $2)',
          [trainingId, departmentId]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

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

  // Trainings visible to a trainee: status = open AND (the training is open to
  // all departments, OR explicitly assigned to the trainee's department, OR
  // assigned only to the subject's department which matches the trainee's).
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
               ORDER BY tr.id DESC LIMIT 1) AS my_status,
              (SELECT COALESCE(array_agg(dep.name ORDER BY dep.name), '{}')
               FROM training_departments tda
               JOIN departments dep ON dep.id = tda.department_id
               WHERE tda.training_id = t.id) AS assigned_departments
       FROM trainings t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN users u ON t.trainer_id = u.id
       WHERE t.status = 'open' AND (
         t.is_all_departments = true
         OR EXISTS (SELECT 1 FROM training_departments td
                    WHERE td.training_id = t.id AND td.department_id = $1)
         OR (NOT EXISTS (SELECT 1 FROM training_departments td2
                         WHERE td2.training_id = t.id) AND s.department_id = $1)
       )
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
               WHERE tr.training_id = t.id AND tr.status IN ('approved', 'completed')) AS approved_count,
              (SELECT COALESCE(array_agg(td.department_id ORDER BY td.department_id), '{}')
               FROM training_departments td
               WHERE td.training_id = t.id) AS department_ids,
              (SELECT COALESCE(array_agg(dep.name ORDER BY dep.name), '{}')
               FROM training_departments tda
               JOIN departments dep ON dep.id = tda.department_id
               WHERE tda.training_id = t.id) AS assigned_departments
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
