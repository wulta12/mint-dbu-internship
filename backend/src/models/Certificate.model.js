const { query } = require('../config/database');
const crypto = require('crypto');

class Certificate {
  // Certificate for a specific trainee + training (or null)
  static async getForTrainee(trainingId, traineeId) {
    const result = await query(
      `SELECT c.*, t.training_title, t.start_date, t.end_date, u.full_name AS trainee_name
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
       JOIN users u ON c.trainee_id = u.id
       WHERE c.training_id = $1 AND c.trainee_id = $2`,
      [trainingId, traineeId]
    );
    return result.rows[0] || null;
  }

  // Issue a certificate ONLY when requirements are met (>=75% progress + passed assessment).
  // Idempotent: returns the existing certificate if already issued.
  static async issueIfEligible(trainingId, traineeId) {
    const existing = await this.getForTrainee(trainingId, traineeId);
    if (existing) return existing;

    const result = await query(
      `INSERT INTO certificates (training_id, trainee_id, certificate_number, verification_code, issue_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING *`,
      [trainingId, traineeId, this.generateCertificateNumber(), this.generateVerificationCode()]
    );
    return result.rows[0];
  }

  static generateCertificateNumber() {
    const year = new Date().getFullYear();
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `MINT-${year}-${suffix}`;
  }

  static generateVerificationCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  static async findByVerificationCode(code) {
    const result = await query(
      `SELECT c.*, u.full_name AS trainee_name, u.email AS trainee_email,
              t.training_title, t.start_date, t.end_date,
              d.name AS department_name
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
       JOIN users u ON c.trainee_id = u.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE c.verification_code = $1`,
      [code]
    );
    return result.rows[0] || null;
  }

  static async getByTrainee(traineeId) {
    const result = await query(
      `SELECT c.*, t.training_title, t.start_date, t.end_date,
              d.name AS department_name
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE c.trainee_id = $1
       ORDER BY c.issue_date DESC`,
      [traineeId]
    );
    return result.rows;
  }

  static async getAll() {
    const result = await query(
      `SELECT c.*, u.full_name AS trainee_name, u.email AS trainee_email,
              t.training_title, d.name AS department_name
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
       JOIN users u ON c.trainee_id = u.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       ORDER BY c.issue_date DESC`
    );
    return result.rows;
  }

  static async findByTraining(trainingId) {
    const result = await query(
      `SELECT c.*, u.full_name AS trainee_name, u.email AS trainee_email
       FROM certificates c
       JOIN users u ON c.trainee_id = u.id
       WHERE c.training_id = $1
       ORDER BY c.issue_date DESC`,
      [trainingId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT c.*, u.full_name AS trainee_name, u.email AS trainee_email,
              t.training_title, t.start_date, t.end_date,
              tu.full_name AS trainer_name,
              d.name AS department_name
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
       JOIN users u ON c.trainee_id = u.id
       LEFT JOIN users tu ON t.trainer_id = tu.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(trainingId, traineeId, issuedBy) {
    const certificateNumber = this.generateCertificateNumber();
    const verificationCode = this.generateVerificationCode();

    const result = await query(
      `INSERT INTO certificates (training_id, trainee_id, certificate_number, verification_code, issue_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING *`,
      [trainingId, traineeId, certificateNumber, verificationCode]
    );
    return result.rows[0];
  }
}

module.exports = Certificate;
