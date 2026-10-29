/**
 * Helper script to initialize Neon PostgreSQL database with database/schema.sql
 *
 * Usage:
 *   node init-neon-db.js
 *   or:
 *   node init-neon-db.js "postgresql://user:pass@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: No DATABASE_URL provided.');
  console.error('Please either pass the Neon connection string as an argument:');
  console.error('  node init-neon-db.js "postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"');
  console.error('or set DATABASE_URL in backend/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function initializeDatabase() {
  const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found at: ${schemaPath}`);
    process.exit(1);
  }

  console.log('⏳ Connecting to Neon PostgreSQL...');
  const client = await pool.connect();
  console.log('✅ Connected successfully.');

  try {
    console.log(`📄 Reading ${schemaPath}...`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Running database schema and initial seed data...');
    await client.query(sql);
    console.log('🎉 Database successfully initialized and seeded with all tables & demo data!');
  } catch (err) {
    console.error('❌ Error applying schema:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();

