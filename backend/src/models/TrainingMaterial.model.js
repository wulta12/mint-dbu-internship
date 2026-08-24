const { query } = require('../config/database');

class TrainingMaterial {
  static async create(materialData) {
    const result = await query(
      `INSERT INTO training_materials
       (training_id, uploaded_by, file_name, file_path, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        materialData.training_id,
        materialData.uploaded_by,
        materialData.file_name,
        materialData.file_path,
        materialData.file_type || null,
        materialData.file_size || 0
      ]
    );
    return result.rows[0];
  }

  static async getByTraining(trainingId) {
    const result = await query(
      `SELECT m.*, u.full_name AS uploaded_by_name
       FROM training_materials m
       LEFT JOIN users u ON m.uploaded_by = u.id
       WHERE m.training_id = $1
       ORDER BY m.created_at DESC`,
      [trainingId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT m.*, u.full_name AS uploaded_by_name
       FROM training_materials m
       LEFT JOIN users u ON m.uploaded_by = u.id
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM training_materials WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = TrainingMaterial;
