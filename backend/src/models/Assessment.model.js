const { query } = require('../config/database');

// =============================================
// Assessments, questions and attempts.
// =============================================

class Assessment {
  // ---------- Assessment ----------

  static async create(trainingId, data) {
    const result = await query(
      `INSERT INTO assessments (training_id, title, description, pass_score, is_published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [trainingId, data.title, data.description || null, data.pass_score || 70, data.is_published !== false && data.is_published !== 'false']
    );
    return result.rows[0];
  }

  static async findByTraining(trainingId) {
    const result = await query('SELECT * FROM assessments WHERE training_id = $1', [trainingId]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM assessments WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let p = 1;
    if (data.title !== undefined) { fields.push(`title = $${p++}`); values.push(data.title); }
    if (data.description !== undefined) { fields.push(`description = $${p++}`); values.push(data.description || null); }
    if (data.pass_score !== undefined) { fields.push(`pass_score = $${p++}`); values.push(data.pass_score); }
    if (data.is_published !== undefined) {
      fields.push(`is_published = $${p++}`);
      values.push(data.is_published === true || data.is_published === 'true');
    }
    if (fields.length === 0) return null;
    values.push(id);
    const result = await query(
      `UPDATE assessments SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  static async delete(id) {
    const result = await query('DELETE FROM assessments WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  // ---------- Questions ----------

  static async addQuestion(assessmentId, data) {
    const result = await query(
      `INSERT INTO assessment_questions
       (assessment_id, question_text, option_a, option_b, option_c, option_d, correct_answer, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, assessment_id, question_text, option_a, option_b, option_c, option_d, correct_answer, position`,
      [assessmentId, data.question_text, data.option_a, data.option_b, data.option_c, data.option_d, data.correct_answer, data.position || 0]
    );
    return result.rows[0];
  }

  // Public list: correct answers removed
  static async getQuestions(assessmentId, { includeAnswers = false } = {}) {
    const select = includeAnswers
      ? 'id, assessment_id, question_text, option_a, option_b, option_c, option_d, correct_answer, position'
      : 'id, assessment_id, question_text, option_a, option_b, option_c, option_d, position';
    const result = await query(
      `SELECT ${select} FROM assessment_questions
       WHERE assessment_id = $1
       ORDER BY position ASC, id ASC`,
      [assessmentId]
    );
    return result.rows;
  }

  static async getQuestion(id) {
    const result = await query(
      `SELECT * FROM assessment_questions WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async updateQuestion(id, data) {
    const allowed = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'position'];
    const fields = [];
    const values = [];
    let p = 1;
    for (const field of allowed) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${p++}`);
        values.push(data[field]);
      }
    }
    if (fields.length === 0) return null;
    values.push(id);
    const result = await query(
      `UPDATE assessment_questions SET ${fields.join(', ')} WHERE id = $${p}
       RETURNING id, assessment_id, question_text, option_a, option_b, option_c, option_d, correct_answer, position`,
      values
    );
    return result.rows[0] || null;
  }

  static async deleteQuestion(id) {
    const result = await query('DELETE FROM assessment_questions WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }

  // ---------- Attempts ----------

  static async countAttempts(trainingId, traineeId) {
    const result = await query(
      `SELECT COUNT(*) AS count FROM assessment_attempts
       WHERE training_id = $1 AND trainee_id = $2`,
      [trainingId, traineeId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  static async createAttempt(assessmentId, trainingId, traineeId, attemptNumber) {
    const result = await query(
      `INSERT INTO assessment_attempts (assessment_id, training_id, trainee_id, attempt_number)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [assessmentId, trainingId, traineeId, attemptNumber]
    );
    return result.rows[0];
  }

  static async getAttempt(attemptId) {
    const result = await query(
      `SELECT * FROM assessment_attempts WHERE id = $1`,
      [attemptId]
    );
    return result.rows[0] || null;
  }

  static async submitAttempt(attemptId, { answers, score, correctCount, totalQuestions, passed }) {
    const result = await query(
      `UPDATE assessment_attempts
       SET answers = $2, score = $3, correct_count = $4, total_questions = $5, passed = $6, submitted_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [attemptId, JSON.stringify(answers), score, correctCount, totalQuestions, passed]
    );
    return result.rows[0] || null;
  }

  static async getAttemptsByTrainee(trainingId, traineeId) {
    const result = await query(
      `SELECT * FROM assessment_attempts
       WHERE training_id = $1 AND trainee_id = $2
       ORDER BY attempt_number ASC`,
      [trainingId, traineeId]
    );
    return result.rows;
  }

  static async hasPassed(trainingId, traineeId) {
    const result = await query(
      `SELECT id FROM assessment_attempts
       WHERE training_id = $1 AND trainee_id = $2 AND passed = true`,
      [trainingId, traineeId]
    );
    return result.rows.length > 0;
  }
}

module.exports = Assessment;
