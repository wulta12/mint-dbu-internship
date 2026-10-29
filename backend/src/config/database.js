const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Neon requires SSL
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'mint_training_system',
    port: process.env.DB_PORT || 5432,
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(poolConfig);

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    throw error;
  }
};

module.exports = { pool, connectDB, query };
