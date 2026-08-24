const { query } = require('../config/database');

class Subject {
  static async getAll() {
    const result = await query(
      `SELECT s.id, s.department_id, s.name, s.description, s.is_active, s.created_at, s.updated_at,
              d.name AS department_name,
              COUNT(DISTINCT t.id) AS training_count
       FROM subjects s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN trainings t ON t.subject_id = s.id
       GROUP BY s.id, d.name
       ORDER BY d.name ASC, s.name ASC`
    );
    return result.rows;
  }

  static async getByDepartment(departmentId) {
    const result = await query(
      `SELECT s.id, s.department_id, s.name, s.description, s.is_active, s.created_at, s.updated_at,
              d.name AS department_name,
              COUNT(DISTINCT t.id) AS training_count
       FROM subjects s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN trainings t ON t.subject_id = s.id
       WHERE s.department_id = $1
       GROUP BY s.id, d.name
       ORDER BY s.name ASC`,
      [departmentId]
    );
    return result.rows;
  }

  static async getActiveByDepartment(departmentId) {
    const result = await query(
      `SELECT id, department_id, name, description, is_active, created_at, updated_at
       FROM subjects
       WHERE department_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [departmentId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT s.id, s.department_id, s.name, s.description, s.is_active, s.created_at, s.updated_at,
              d.name AS department_name
       FROM subjects s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data) {
    const result = await query(
      `INSERT INTO subjects (department_id, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, department_id, name, description, is_active, created_at, updated_at`,
      [data.department_id, data.name, data.description || null, data.is_active === undefined ? true : data.is_active]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.department_id !== undefined) {
      fields.push(`department_id = $${paramCount++}`);
      values.push(data.department_id);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE subjects
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, department_id, name, description, is_active, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  }

  static async toggleActive(id, isActive) {
    const result = await query(
      `UPDATE subjects
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, department_id, name, description, is_active, created_at, updated_at`,
      [isActive, id]
    );
    return result.rows[0] || null;
  }

  static async getTrainings(subjectId) {
    const result = await query(
      `SELECT t.id, t.subject_id, t.training_title, t.training_description, t.training_type,
              t.location_or_meeting_link, t.start_date, t.end_date, t.capacity, t.status,
              u.full_name AS trainer_name,
              COUNT(DISTINCT tr.trainee_id) AS approved_count
       FROM trainings t
       LEFT JOIN users u ON t.trainer_id = u.id
       LEFT JOIN training_requests tr ON tr.training_id = t.id AND tr.status IN ('approved', 'completed')
       WHERE t.subject_id = $1
       GROUP BY t.id, u.full_name
       ORDER BY t.start_date ASC`,
      [subjectId]
    );
    return result.rows;
  }
}

module.exports = Subject;
