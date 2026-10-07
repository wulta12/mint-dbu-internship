const { query } = require('../config/database');
const crypto = require('crypto');
const User = require('./User.model');

// =============================================
// Certificates.
//
// The trainee name is ALWAYS resolved from the user
// record (id -> first_name + last_name) and stored as an
// immutable snapshot on the certificate. It is never
// accepted from a request body, so a certificate can
// never be printed with somebody else's name.
// =============================================

// Columns that identify the issued certificate itself.
const CERT_SELECT = `
  c.id, c.training_id, c.trainee_id, c.trainee_name, c.certificate_number,
  c.verification_code, c.status, c.issue_date, c.revoked_at, c.revoked_reason, c.created_at`;

// Canonical trainee name for a user id, straight from the DB.
async function resolveTraineeName(traineeId) {
  const identity = await User.getIdentity(traineeId);
  if (!identity) return null;
  return identity.full_name;
}

class Certificate {
  // Certificate for a specific trainee + training (or null)
  static async getForTrainee(trainingId, traineeId) {
    const result = await query(
      `SELECT ${CERT_SELECT}, t.training_title, t.start_date, t.end_date
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
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
    return this.create(trainingId, traineeId, null);
  }

  // Sequential, human-readable number: MINT-2026-000123
  static async generateCertificateNumber() {
    const year = new Date().getFullYear();
    const result = await query(
      `SELECT COUNT(*) AS count FROM certificates WHERE certificate_number LIKE $1`,
      [`MINT-${year}-%`]
    );
    let next = parseInt(result.rows[0].count, 10) + 1;
    // Extremely unlikely, but never emit a duplicate number.
    for (let i = 0; i < 50; i++) {
      const candidate = `MINT-${year}-${String(next).padStart(6, '0')}`;
      const clash = await query('SELECT 1 FROM certificates WHERE certificate_number = $1', [candidate]);
      if (clash.rows.length === 0) return candidate;
      next++;
    }
    return `MINT-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  static generateVerificationCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  // Public verification lookup. Accepts EITHER the certificate
  // number (what the QR encodes) or the verification code.
  static async findByReference(reference) {
    const value = String(reference || '').trim();
    if (!value) return null;
    const result = await query(
      `SELECT ${CERT_SELECT},
              t.training_title, t.start_date, t.end_date, t.training_type,
              tu.full_name AS trainer_name,
              d.name AS department_name
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
       LEFT JOIN users tu ON t.trainer_id = tu.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE c.certificate_number = $1 OR c.verification_code = $1
       LIMIT 1`,
      [value]
    );
    return result.rows[0] || null;
  }

  // Kept for the certificate number / verification code display.
  static async findByVerificationCode(code) {
    return this.findByReference(String(code || '').trim().toUpperCase());
  }

  static async getByTrainee(traineeId) {
    const result = await query(
      `SELECT ${CERT_SELECT}, t.training_title, t.start_date, t.end_date,
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
      `SELECT ${CERT_SELECT}, u.full_name AS trainee_full_name, u.email AS trainee_email,
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
      `SELECT ${CERT_SELECT}, t.training_title
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
       WHERE c.training_id = $1
       ORDER BY c.issue_date DESC`,
      [trainingId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT ${CERT_SELECT}, t.training_title, t.start_date, t.end_date,
              tu.full_name AS trainer_name,
              d.name AS department_name
       FROM certificates c
       JOIN trainings t ON c.training_id = t.id
       LEFT JOIN users tu ON t.trainer_id = tu.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  // Create a certificate. The trainee name comes from the user
  // record; `issuedBy` is only recorded for audit.
  static async create(trainingId, traineeId, issuedBy = null) {
    const traineeName = await resolveTraineeName(traineeId);
    const certificateNumber = await this.generateCertificateNumber();
    const verificationCode = this.generateVerificationCode();

    const result = await query(
      `INSERT INTO certificates
       (training_id, trainee_id, trainee_name, certificate_number, verification_code, status, issue_date)
       VALUES ($1, $2, $3, $4, $5, 'valid', CURRENT_DATE)
       RETURNING *`,
      [trainingId, traineeId, traineeName, certificateNumber, verificationCode]
    );
    return result.rows[0];
  }

  // Admin/trainer revoke. A revoked certificate reports as
  // INVALID on the public verification page.
  static async revoke(id, reason, revokedBy) {
    const result = await query(
      `UPDATE certificates
       SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP,
           revoked_by = $2, revoked_reason = $3
       WHERE id = $1 AND status = 'valid'
       RETURNING *`,
      [id, revokedBy || null, reason || null]
    );
    return result.rows[0] || null;
  }
}

module.exports = Certificate;
