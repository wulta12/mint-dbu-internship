const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Splits a full name into first + last. Used to keep the
  // users.first_name / users.last_name columns in sync with
  // full_name. first_name + last_name is what a certificate
  // prints, and it is always resolved from the user record.
  static splitName(fullName) {
    const trimmed = String(fullName == null ? '' : fullName).trim().replace(/\s+/g, ' ');
    if (!trimmed) return { first_name: null, last_name: null };
    const idx = trimmed.indexOf(' ');
    if (idx < 0) return { first_name: trimmed, last_name: null };
    return { first_name: trimmed.slice(0, idx), last_name: trimmed.slice(idx + 1) || null };
  }

  // Authoritative display name for a user row: prefer the
  // stored first/last parts, fall back to full_name.
  static resolveFullName(row) {
    if (!row) return null;
    const parts = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
    if (parts) return parts;
    return row.full_name || null;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.first_name, u.last_name, u.email, u.phone, u.role, u.department_id, u.department_locked, u.is_active, u.profile_image, u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.first_name, u.last_name, u.email, u.password, u.phone, u.role, u.department_id, u.department_locked, u.is_active, u.profile_image, u.auth_provider, u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  // Same as findByEmail but case-insensitive. Email addresses are matched
  // case-insensitively everywhere else in this file is not assumed: Google
  // lowercases the address it reports, while an account may have been
  // registered as "Name@Example.com", so an exact '=' would miss it.
  static async findByEmailCaseInsensitive(email) {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.first_name, u.last_name, u.email, u.password, u.phone, u.role, u.department_id, u.department_locked, u.is_active, u.profile_image, u.auth_provider, u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    return result.rows[0] || null;
  }

  // The account a Google subject is already linked to.
  //
  // This is the lookup that makes repeat sign-ins work without re-matching on
  // email every time, and it is consulted FIRST: if the address behind a `sub`
  // ever changes, the link still resolves to the account the user originally
  // proved they control.
  static async findByGoogleId(googleId) {
    if (!googleId) return null;
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.first_name, u.last_name, u.email, u.password, u.phone, u.role, u.department_id, u.department_locked, u.is_active, u.profile_image, u.auth_provider, u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.google_id = $1`,
      [googleId]
    );
    return result.rows[0] || null;
  }

  // Records that this account has signed in with this Google identity.
  //
  // `substitute_default` is what makes this safe to call on every Google
  // sign-in: when the account was found by email and had no link yet, the
  // google_id is written; when it is already linked to the SAME sub, only the
  // auth_provider stamp is refreshed. If it is linked to a DIFFERENT sub the
  // WHERE clause does not match, nothing is changed, and the caller is told
  // (updated === null) instead of the link being silently overwritten.
  //
  // Note this never touches password, role, department or is_active.
  static async linkGoogleAccount(userId, googleId) {
    const result = await pool.query(
      `UPDATE users
       SET google_id = COALESCE(google_id, $2),
           auth_provider = 'google',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND (google_id IS NULL OR google_id = $2)
       RETURNING id, full_name, first_name, last_name, email, phone, role,
                 department_id, department_locked, is_active, profile_image,
                 auth_provider, created_at, updated_at`,
      [userId, googleId]
    );
    return result.rows[0] || null;
  }

  // The trainee's own identity, used for certificate issuing.
  // Only ever called with an id that came from the server-side
  // session, never from a request body.
  static async getIdentity(id) {
    const result = await pool.query(
      `SELECT id, full_name, first_name, last_name, email
       FROM users WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] || null;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: this.resolveFullName(row)
    };
  }

  static async findAll(filters = {}) {
    let query = `SELECT u.id, u.full_name, u.first_name, u.last_name, u.email, u.phone, u.role, u.department_id, u.department_locked, u.is_active, u.profile_image, u.created_at, u.updated_at,
                        d.name as department_name
                 FROM users u
                 LEFT JOIN departments d ON u.department_id = d.id`;
    const values = [];
    const conditions = [];

    if (filters.role) {
      conditions.push(`u.role = $${values.length + 1}`);
      values.push(filters.role);
    }

    if (filters.department_id) {
      conditions.push(`u.department_id = $${values.length + 1}`);
      values.push(filters.department_id);
    }

    if (filters.is_active !== undefined) {
      conditions.push(`u.is_active = $${values.length + 1}`);
      values.push(filters.is_active);
    }

    if (filters.search) {
      conditions.push(`(u.full_name ILIKE $${values.length + 1} OR u.email ILIKE $${values.length + 1})`);
      values.push(`%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async create(userData) {
    const { full_name, email, password, phone, role, department_id } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const { first_name, last_name } = this.splitName(full_name);

    const result = await pool.query(
      `INSERT INTO users (full_name, first_name, last_name, email, password, phone, role, department_id, department_locked, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING id, full_name, first_name, last_name, email, phone, role, department_id, department_locked, is_active, created_at`,
      [full_name, first_name, last_name, email, hashedPassword, phone || null, role || 'trainee', department_id || null, department_id ? true : false]
    );

    return result.rows[0];
  }

  static async update(id, userData) {
    const { full_name, phone, profile_image, is_active, department_id, department_locked } = userData;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
      // Keep the certificate name parts in sync with the display name.
      const { first_name, last_name } = this.splitName(full_name);
      updates.push(`first_name = $${paramCount++}`);
      values.push(first_name);
      updates.push(`last_name = $${paramCount++}`);
      values.push(last_name);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }

    if (profile_image !== undefined) {
      updates.push(`profile_image = $${paramCount++}`);
      values.push(profile_image);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (department_id !== undefined) {
      updates.push(`department_id = $${paramCount++}`);
      values.push(department_id);
    }

    if (department_locked !== undefined) {
      updates.push(`department_locked = $${paramCount++}`);
      values.push(department_locked);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, full_name, first_name, last_name, email, phone, role, department_id, department_locked, is_active, profile_image, created_at, updated_at`,
      values
    );

    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [hashedPassword, id]
    );
    return result.rows[0] || null;
  }

  // Admin changes a user's department (always locks it)
  static async updateDepartment(id, department_id) {
    const result = await pool.query(
      `UPDATE users SET department_id = $1, department_locked = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING id, full_name, email, role, department_id, department_locked, is_active`,
      [department_id || null, id]
    );
    return result.rows[0] || null;
  }

  static async toggleActive(id, is_active) {
    const result = await pool.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, is_active',
      [is_active, id]
    );
    return result.rows[0] || null;
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0] || null;
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async countByRole(role) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM users WHERE role = $1',
      [role]
    );
    return parseInt(result.rows[0].count);
  }

  static async getStats() {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN role = 'trainer' THEN 1 END) as trainers,
        COUNT(CASE WHEN role = 'trainee' THEN 1 END) as trainees,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active
       FROM users`
    );
    return result.rows[0];
  }
}

module.exports = User;
