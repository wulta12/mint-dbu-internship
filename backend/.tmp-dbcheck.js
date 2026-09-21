const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const p = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres123', database: 'mint_training_system' });

(async () => {
  try {
    const r = await p.query(
      `SELECT u.id, u.full_name, u.email, u.password, u.phone, u.role, u.department_id, u.department_locked, u.is_active, u.profile_image, u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1`,
      ['admin@mint.gov.et']
    );
    console.log('ROWS:', r.rows.length);
    const u = r.rows[0];
    if (u) {
      console.log('role:', u.role, '| is_active:', u.is_active);
      console.log('password123 match:', bcrypt.compareSync('password123', u.password));
    }
  } catch (e) {
    console.error('ERR:', e.message, e.stack);
  }
  await p.end();
})();