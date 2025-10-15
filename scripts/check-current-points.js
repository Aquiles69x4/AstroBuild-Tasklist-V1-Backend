const db = require('../database/db');

async function checkPoints() {
  try {
    console.log('📊 Current Mechanic Points:\n');

    const result = await db.query(`
      SELECT name, total_points, total_tasks
      FROM mechanics
      ORDER BY total_points DESC, name;
    `);

    result.rows.forEach(m => {
      console.log(`${m.name}: ${m.total_points} points, ${m.total_tasks} tasks`);
    });

    console.log('\n📝 According to your logs:');
    console.log('IgenieroErick had 10 points before task 55');
    console.log('Task 55 added 5 points');
    console.log('Expected result: 15 points');
    console.log(`Actual result: ${result.rows.find(m => m.name === 'IgenieroErick')?.total_points || 'N/A'} points`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPoints();
