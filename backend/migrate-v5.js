// Applies database/v5_video_attestation.sql (manual confirmation for videos
// whose provider cannot report playback progress) to an existing database.
// Idempotent: safe to run multiple times.
//
// Usage: node migrate-v5.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, pool } = require('./src/config/database');

(async () => {
  const file = path.join(__dirname, '..', 'database', 'v5_video_attestation.sql');
  const sql = fs.readFileSync(file, 'utf8');

  try {
    await query(sql);
    console.log('v5 upgrade applied successfully');
  } catch (e) {
    console.error('v5 upgrade failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  try {
    const columns = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'trainee_progress'
         AND column_name IN ('video_attested_at', 'video_attested_reason')
       ORDER BY column_name`
    );
    const names = columns.rows.map((r) => r.column_name);
    console.log('columns present:', names.join(', ') || '(none)');
    if (names.length !== 2) {
      console.error('Verification failed: expected both attestation columns');
      await pool.end();
      process.exit(1);
    }
  } catch (e) {
    console.error('Verification failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
})();