// Adds the password_reset_tokens table to an existing database.
//
// schema.sql already creates password_reset_tokens, but schema.sql begins with
// DROP TABLE ... CASCADE so it can only be used for a fresh install. Run this
// (or database/password_reset.sql) to add the table without touching anything
// else. Idempotent: safe to run more than once.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query } = require('./src/config/database');

(async () => {
  let client;
  try {
    client = await pool.connect();

    const existing = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'`
    );
    const alreadyThere = existing.rowCount > 0;

    const file = path.join(__dirname, '..', 'database', 'password_reset.sql');
    const sql = fs.readFileSync(file, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log(
      alreadyThere
        ? 'password_reset_tokens already present - no changes made'
        : 'password_reset_tokens table created'
    );
  } catch (e) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }

  try {
    const r = await query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'password_reset_tokens'
       ORDER BY ordinal_position`
    );
    console.log('=== password_reset_tokens columns ===');
    console.table(r.rows);
  } catch (e) {
    console.error('Verify failed:', e.message);
    process.exit(1);
  }

  process.exit(0);
})();
