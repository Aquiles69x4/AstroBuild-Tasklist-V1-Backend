#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const db = require('../database/db');

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  try {
    // Create migrations table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('📝 No migration files found');
      return;
    }

    // Check which migrations have already been run
    const executedResult = await db.query('SELECT filename FROM migrations');
    const executedMigrations = executedResult.rows.map(row => row.filename);

    let ranCount = 0;

    for (const filename of migrationFiles) {
      if (executedMigrations.includes(filename)) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        continue;
      }

      console.log(`🚀 Running migration: ${filename}`);

      try {
        // Read and execute migration
        const migrationPath = path.join(migrationsDir, filename);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await db.exec(migrationSQL);

        // Mark as executed
        await db.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );

        console.log(`✅ Migration ${filename} completed successfully`);
        ranCount++;

      } catch (error) {
        console.error(`❌ Migration ${filename} failed:`, error);
        throw error;
      }
    }

    if (ranCount === 0) {
      console.log('📋 All migrations are up to date');
    } else {
      console.log(`🎉 Successfully ran ${ranCount} migration(s)`);
    }

  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.closePool();
  }
}

// Run migrations if this script is called directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;