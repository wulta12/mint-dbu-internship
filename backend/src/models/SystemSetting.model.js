const { query } = require('../config/database');

// Admin-controlled feature switches.
//
// These live in the DATABASE on purpose: the backend is
// the only authority on whether a feature is available.
// Hiding a button in React is cosmetic, so every guarded
// feature also checks its flag here.
class SystemSetting {
  // Feature keys understood by the application.
  static KEYS = {
    TRAINER_AI: 'trainer_ai_enabled'
  };

  static async getAll() {
    const result = await query('SELECT key, value, updated_at FROM system_settings ORDER BY key');
    return result.rows;
  }

  // Same data as getAll(), but as a plain { key: value } map, which is the
  // shape the admin settings endpoint returns to the frontend.
  static async getAllMap() {
    const rows = await this.getAll();
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  static async get(key) {
    const result = await query('SELECT value FROM system_settings WHERE key = $1', [key]);
    return result.rows[0] ? result.rows[0].value : null;
  }

  // Reads a boolean flag. Unknown/absent keys fall back to
  // the supplied default, so a missing row never crashes a request.
  static async getBool(key, defaultValue = false) {
    const value = await this.get(key);
    if (value === null || value === undefined || value === '') return defaultValue;
    return String(value).toLowerCase() === 'true' || String(value) === '1';
  }

  static async set(key, value, updatedBy = null) {
    const result = await query(
      `INSERT INTO system_settings (key, value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by
       RETURNING key, value, updated_at`,
      [key, value, updatedBy]
    );
    return result.rows[0];
  }

  // The single check the Trainer AI endpoints rely on.
  static async isTrainerAiEnabled() {
    return this.getBool(this.KEYS.TRAINER_AI, true);
  }
}

module.exports = SystemSetting;
