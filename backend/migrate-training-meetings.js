// Adds the training_meetings + meeting_attendance tables to an existing database.
//
// Idempotent: safe to run more than once. Mirrors migrate-password-reset-otp.js.
// Safe by construction: it only CREATEs new tables and never touches
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
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('training_meetings', 'meeting_attendance')`
    );
    const alreadyThere = existing.rowCount > 0;

    const file = path.join(__dirname, '..', 'database', 'training_meetings.sql');
    const sql = fs.readFileSync(file, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log(
      alreadyThere
        ? 'training_meetings / meeting_attendance already present - no changes made'
        : 'training_meetings + meeting_attendance tables created'
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
      `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name IN ('training_meetings', 'meeting_attendance')
       ORDER BY table_name, ordinal_position`
    );
    console.log('=== meeting table columns ===');
    console.table(r.rows);

    const counts = await query(
      `SELECT
         (SELECT COUNT(*) FROM training_meetings)      AS meetings,
         (SELECT COUNT(*) FROM meeting_attendance)     AS meeting_attendance,
         (SELECT COUNT(*) FROM trainings)              AS trainings_untouched,
         (SELECT COUNT(*) FROM attendance)             AS attendance_untouched,
         (SELECT COUNT(*) FROM training_requests)      AS requests_untouched,
         (SELECT COUNT(*) FROM certificates)           AS certificates_untouched`
    );
    console.log('=== existing feature row counts (must be unchanged) ===');
    console.table(counts.rows);
  } catch (e) {
    console.error('Verify failed:', e.message);
    process.exit(1);
  }

  process.exit(0);
})();