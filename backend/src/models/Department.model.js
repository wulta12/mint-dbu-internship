const { query } = require('../config/database');

class Department {
  static async getAll() {
    const result = await query(
      `SELECT d.id, d.name, d.description, d.is_active, d.created_at, d.updated_at,
              COUNT(DISTINCT s.id) AS subject_count,
              COUNT(DISTINCT u.id) AS member_count
       FROM departments d
       LEFT JOIN subjects s ON s.department_id = d.id
       LEFT JOIN users u ON u.department_id = d.id
       GROUP BY d.id
       ORDER BY d.name ASC`
    );
    return result.rows;
  }

  static async getActive() {
    const result = await query(
      `SELECT id, name, description, is_active, created_at, updated_at
       FROM departments
       WHERE is_active = true
       ORDER BY name ASC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      'SELECT id, name, description, is_active, created_at, updated_at FROM departments WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data) {
    const result = await query(
      `INSERT INTO departments (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [data.name, data.description || null, data.is_active === undefined ? true : data.is_active]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const result = await query(
      `UPDATE departments
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [data.name, data.description || null, id]
    );
    return result.rows[0] || null;
  }

  static async toggleActive(id, isActive) {
    const result = await query(
      `UPDATE departments
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [isActive, id]
    );
    return result.rows[0] || null;
  }

  static async getSubjects(departmentId) {
    const result = await query(
      `SELECT id, department_id, name, description, is_active, created_at, updated_at
       FROM subjects
       WHERE department_id = $1
       ORDER BY name ASC`,
      [departmentId]
    );
    return result.rows;
  }
}

module.exports = Department;
