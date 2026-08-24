// Applies database/lms.sql (the Learning Management System feature) to an
// existing database. Idempotent: safe to run multiple times.
//
// Usage: node migrate-lms.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./src/config/database');

(async () => {
  const file = path.join(__dirname, '..', 'database', 'lms.sql');
  const sql = fs.readFileSync(file, 'utf8');
  try {
    await query(sql);
    console.log('✅ LMS migration applied successfully');
  } catch (e) {
    console.error('❌ LMS migration failed:', e.message);
    process.exit(1);
  }

  try {
    const modules = await query('SELECT count(*) c FROM training_modules');
    const lessons = await query('SELECT count(*) c FROM lessons');
    const assessments = await query('SELECT count(*) c FROM assessments');
    const questions = await query('SELECT count(*) c FROM assessment_questions');
    console.table({
      modules: modules.rows[0].c,
      lessons: lessons.rows[0].c,
      assessments: assessments.rows[0].c,
      questions: questions.rows[0].c
    });
  } catch (e) {
    console.error('Verify failed:', e.message);
    process.exit(1);
  }

  process.exit(0);
})();
