const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection using Supabase
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database (Supabase)');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

// Query function that maintains compatibility with existing routes
async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      lastID: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null
    };
  } finally {
    client.release();
  }
}

// Function to execute multiple statements (used for migrations)
async function exec(sql) {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('SQL executed successfully');
  } finally {
    client.release();
  }
}

// Function to initialize database with migrations (for production auto-setup)
async function initializeDatabase() {
  try {
    const fs = require('fs');
    const path = require('path');

    const migrationPath = path.join(__dirname, '../scripts/migrations/001_init.sql');
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      await exec(migration);
      console.log('Database initialized with PostgreSQL schema');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Close pool connection gracefully
async function closePool() {
  await pool.end();
}

// Auto-initialize in production (Vercel)
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  initializeDatabase().catch(console.error);
}

module.exports = {
  query,
  exec,
  pool,
  initializeDatabase,
  closePool
};