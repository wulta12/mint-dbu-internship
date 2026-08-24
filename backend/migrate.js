require('dotenv').config();
const { query } = require('./src/config/database');

(async () => {
  try {
    await query(`ALTER TABLE trainings ADD COLUMN IF NOT EXISTS is_all_departments BOOLEAN NOT NULL DEFAULT false`);
    console.log('Column added: is_all_departments (BOOLEAN NOT NULL DEFAULT false)');
  } catch (e) {
    console.error('ALTER failed:', e.message);
    process.exit(1);
  }

  try {
    const r = await query(
      `SELECT t.id, t.training_title, t.is_all_departments,
              s.department_id AS subject_dept
       FROM trainings t LEFT JOIN subjects s ON s.id = t.subject_id
       ORDER BY t.id`
    );
    console.log('=== trainings after migration ===');
    console.table(r.rows);
  } catch (e) {
    console.error('Verify failed:', e.message);
    process.exit(1);
  }

  // Simulate getByDepartment for department 1 (trainee 5, who has 2 my-trainings)
  try {
    const r = await query(
      `SELECT t.id, t.training_title, t.status, t.is_all_departments
       FROM trainings t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.status = 'open' AND (t.is_all_departments = true OR s.department_id = $1)
       ORDER BY t.start_date ASC`,
      [1]
    );
    console.log('=== getByDepartment (dept 1) after migration ===');
    console.table(r.rows);
  } catch (e) {
    console.error('getByDepartment simulation failed:', e.message);
  }

  process.exit(0);
})();
