const { query } = require('../config/database');

class Trainer {
  // Create trainer profile
  static async create(trainerData) {
    const { user_id, department_id, specialization, qualification, biography } = trainerData;

    const result = await query(
      `INSERT INTO trainers (user_id, department_id, specialization, qualification, biography)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, department_id || null, specialization || null, qualification || null, biography || null]
    );
    return result.rows[0];
  }

  // Get trainer by user ID
  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM trainers WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  // Get trainer with user details
  static async getTrainerWithUser(userId) {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.department_id,
              d.name AS department_name,
              t.specialization, t.qualification, t.biography
       FROM users u
       JOIN trainers t ON u.id = t.user_id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // Get all trainers
  static async getAll() {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.department_id,
              d.name AS department_name,
              t.specialization, t.qualification, t.biography,
              COUNT(DISTINCT tr.id) AS assigned_trainings
       FROM users u
       JOIN trainers t ON u.id = t.user_id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN trainings tr ON tr.trainer_id = u.id
       WHERE u.role = 'trainer'
       GROUP BY u.id, t.id, d.name
       ORDER BY u.full_name`
    );
    return result.rows;
  }

  // Update trainer profile
  static async update(userId, trainerData) {
    const { department_id, specialization, qualification, biography } = trainerData;

    const result = await query(
      `UPDATE trainers
       SET department_id = $1, specialization = $2, qualification = $3, biography = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING *`,
      [department_id || null, specialization, qualification, biography, userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = Trainer;
