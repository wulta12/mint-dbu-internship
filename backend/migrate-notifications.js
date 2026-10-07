// Adds the notifications table to an existing database.
//
// schema.sql already creates notifications, but schema.sql begins with
// DROP TABLE ... CASCADE so it can only be used for a fresh install. Run this
// (or database/notifications.sql) to add the table without touching anything
// else. Idempotent: safe to run more than once.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query } = require('./src/config/database');

(async () => {
  let client;
  try {
    client = await pool.connect();

    // The SQL skips create + backfill when the table is already there, so
    // report what actually happened rather than assuming it created it.
    const existing = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'notifications'`
    );
    const alreadyThere = existing.rowCount > 0;

    const file = path.join(__dirname, '..', 'database', 'notifications.sql');
    const sql = fs.readFileSync(file, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log(
      alreadyThere
        ? 'notifications already present - no changes made'
        : 'notifications table created and backfilled'
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
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_read = false) AS unread
       FROM notifications`
    );
    console.log('=== notifications after migration ===');
    console.table(r.rows);
  } catch (e) {
    console.error('Verify failed:', e.message);
    process.exit(1);
  }

  process.exit(0);
})();
