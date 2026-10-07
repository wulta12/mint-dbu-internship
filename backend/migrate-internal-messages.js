// Adds direct messaging between an admin and a signed-in user, plus reply
// tracking on the public contact-form messages.
//
// schema.sql already creates both, but schema.sql begins with DROP TABLE ...
// CASCADE so it can only be used for a fresh install. Run this (or
// database/internal_messages.sql) to add them to an existing database without
// touching anything else. Idempotent: safe to run more than once.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query } = require('./src/config/database');

(async () => {
  let client;
  try {
    client = await pool.connect();

    // The SQL skips creation when the table is already there, so report what
    // actually happened rather than assuming it created it.
    const existing = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'internal_messages'`
    );
    const alreadyThere = existing.rowCount > 0;

    const file = path.join(__dirname, '..', 'database', 'internal_messages.sql');
    const sql = fs.readFileSync(file, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log(
      alreadyThere
        ? 'internal_messages already present - no changes made'
        : 'internal_messages table created'
    );
  } catch (e) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }

  try {
    const messages = await query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_read = false) AS unread
       FROM internal_messages`
    );
    console.log('=== internal_messages after migration ===');
    console.table(messages.rows);

    const contact = await query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_replied = true) AS replied
       FROM contact_messages`
    );
    console.log('=== contact_messages reply tracking ===');
    console.table(contact.rows);
  } catch (e) {
    console.error('Verify failed:', e.message);
    process.exit(1);
  }

  process.exit(0);
})();
