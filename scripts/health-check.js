#!/usr/bin/env node

const db = require('../database/db');

async function healthCheck() {
  console.log('🔍 Checking database connection...');

  try {
    // Test basic connection
    const startTime = Date.now();
    const result = await db.query('SELECT NOW() as current_time, version() as postgres_version');
    const duration = Date.now() - startTime;

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      console.log('✅ Database connection successful!');
      console.log(`📅 Server time: ${row.current_time}`);
      console.log(`💫 PostgreSQL version: ${row.postgres_version}`);
      console.log(`⚡ Response time: ${duration}ms`);
    }

    // Test tables exist
    const tablesResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log('📊 Tables found:');
      tablesResult.rows.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('⚠️  No tables found. Run migrations first: npm run db:migrate');
    }

    // Test sample data
    try {
      const carsCount = await db.query('SELECT COUNT(*) as count FROM cars');
      const mechanicsCount = await db.query('SELECT COUNT(*) as count FROM mechanics');
      const tasksCount = await db.query('SELECT COUNT(*) as count FROM tasks');

      console.log('📈 Data summary:');
      console.log(`   - Cars: ${carsCount.rows[0].count}`);
      console.log(`   - Mechanics: ${mechanicsCount.rows[0].count}`);
      console.log(`   - Tasks: ${tasksCount.rows[0].count}`);
    } catch (tableError) {
      console.log('⚠️  Could not query tables (they may not exist yet)');
    }

    console.log('🎉 Health check completed successfully!');

  } catch (error) {
    console.error('❌ Database health check failed:');
    console.error('Error details:', error.message);

    if (error.code) {
      console.error('Error code:', error.code);
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('💡 Check your SUPABASE_DB_URL environment variable');
    }

    process.exit(1);
  } finally {
    // Close database connection
    await db.closePool();
  }
}

// Run health check if this script is called directly
if (require.main === module) {
  healthCheck();
}

module.exports = healthCheck;