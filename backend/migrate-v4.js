// Applies database/v4_unlimited_attempts.sql (removes the assessment
// attempt limit) to an existing database.
// Idempotent: safe to run multiple times.
//
// Usage: node migrate-v4.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, pool } = require('./src/config/database');

(async () => {
  const file = path.join(__dirname, '..', 'database', 'v4_unlimited_attempts.sql');
  const sql = fs.readFileSync(file, 'utf8');

  try {
    await query(sql);
    console.log('v4 upgrade applied successfully');
  } catch (e) {
    console.error('v4 upgrade failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  try {
    const remaining = await query(
      `SELECT COUNT(*) AS c FROM assessments WHERE max_attempts IS NOT NULL`
    );
    const defaultValue = await query(
      `SELECT column_default FROM information_schema.columns
       WHERE table_name = 'assessments' AND column_name = 'max_attempts'`
    );
    const attemptTiming = await query(
      `SELECT COUNT(*) AS c FROM assessment_attempts
       WHERE time_limit_minutes IS NOT NULL AND expires_at IS NULL`
    );

    console.log('assessments still holding an attempt cap:', remaining.rows[0].c, '(expected 0)');
    console.log('max_attempts column default:            ', defaultValue.rows[0].column_default, '(expected null)');
    console.log('timed attempts missing expires_at:      ', attemptTiming.rows[0].c, '(expected 0)');
  } catch (e) {
    console.error('Verification failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
})();
