const db = require('../database/db');

async function resetPoints() {
  try {
    console.log('🔄 Resetting all mechanic points to 0...\n');

    // Get current points
    const current = await db.query('SELECT name, total_points, total_tasks FROM mechanics ORDER BY name');

    console.log('Current points:');
    current.rows.forEach(m => {
      console.log(`  ${m.name}: ${m.total_points} points, ${m.total_tasks} tasks`);
    });
    console.log('');

    // Reset all points
    await db.query('UPDATE mechanics SET total_points = 0, total_tasks = 0');

    console.log('✅ All mechanic points reset to 0\n');
    console.log('⚠️  Note: You can now complete tasks and points will be counted correctly from 0\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting points:', error);
    process.exit(1);
  }
}

resetPoints();
