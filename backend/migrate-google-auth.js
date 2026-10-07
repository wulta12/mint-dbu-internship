// Adds Google sign-in support to an existing database.
//
// Idempotent: safe to run more than once. Mirrors migrate-training-meetings.js.
// Safe by construction: it only ADDs two nullable-with-default columns to
// `users` and never touches role, department, is_active, password hashes,
// trainings, attendance, training_requests, assessments or certificates.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query } = require('./src/config/database');

(async () => {
  let client;
  try {
    client = await pool.connect();

    const existing = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name IN ('auth_provider', 'google_id')`
    );
    const alreadyThere = existing.rowCount >= 2;

    const file = path.join(__dirname, '..', 'database', 'google_auth.sql');
    const sql = fs.readFileSync(file, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log(
      alreadyThere
        ? 'users.auth_provider / users.google_id already present - no changes made'
        : 'users.auth_provider + users.google_id added'
    );
  } catch (e) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }

  try {
    const cols = await query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'users'
         AND column_name IN ('auth_provider', 'google_id', 'password', 'role', 'is_active')
       ORDER BY column_name`
    );
    console.log('=== users columns ===');
    console.table(cols.rows);

    const counts = await query(
      `SELECT
         (SELECT COUNT(*) FROM users)                        AS users_untouched,
         (SELECT COUNT(*) FROM users WHERE password IS NOT NULL) AS passwords_untouched,
         (SELECT COUNT(*) FROM users WHERE role = 'admin')   AS admins_untouched,
         (SELECT COUNT(*) FROM users WHERE role = 'trainer') AS trainers_untouched,
         (SELECT COUNT(*) FROM users WHERE role = 'trainee') AS trainees_untouched`
    );
    console.log('=== existing accounts must be unchanged ===');
    console.table(counts.rows);
  } catch (e) {
    console.error('Verify failed:', e.message);
    process.exit(1);
  }

  process.exit(0);
})();
