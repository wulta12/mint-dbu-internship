// Applies database/v3_upgrade.sql (assessment integrity, AI assistant switches,
// certificate identity + verification) to an existing database.
// Idempotent: safe to run multiple times.
//
// Usage: node migrate-v3.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, pool } = require('./src/config/database');

(async () => {
  const file = path.join(__dirname, '..', 'database', 'v3_upgrade.sql');
  const sql = fs.readFileSync(file, 'utf8');

  try {
    await query(sql);
    console.log('v3 upgrade applied successfully');
  } catch (e) {
    console.error('v3 upgrade failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  try {
    const assessmentCols = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'assessments' ORDER BY column_name`
    );
    const attemptCols = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'assessment_attempts' ORDER BY column_name`
    );
    const certCols = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'certificates' ORDER BY column_name`
    );
    const settings = await query(`SELECT key, value FROM system_settings ORDER BY key`);
    const missingCodes = await query(
      `SELECT COUNT(*) AS c FROM certificates WHERE verification_code IS NULL OR verification_code = ''`
    );
    const missingNames = await query(
      `SELECT COUNT(*) AS c FROM certificates WHERE trainee_name IS NULL OR trainee_name = ''`
    );

    console.log('assessments:      ', assessmentCols.rows.map((r) => r.column_name).join(', '));
    console.log('attempts:         ', attemptCols.rows.map((r) => r.column_name).join(', '));
    console.log('certificates:     ', certCols.rows.map((r) => r.column_name).join(', '));
    console.log('system_settings:  ', JSON.stringify(settings.rows));
    console.log('certificates without verification code:', missingCodes.rows[0].c);
    console.log('certificates without trainee name:     ', missingNames.rows[0].c);
  } catch (e) {
    console.error('Verification failed:', e.message);
    await pool.end();
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
})();
