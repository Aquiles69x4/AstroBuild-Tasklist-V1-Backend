const db = require('../database/db');

async function checkTriggers() {
  try {
    console.log('🔍 Checking active triggers in PostgreSQL...\n');

    const result = await db.query(`
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `);

    if (result.rows.length === 0) {
      console.log('✅ No triggers found in database\n');
    } else {
      console.log(`Found ${result.rows.length} trigger(s):\n`);
      result.rows.forEach((trigger, index) => {
        console.log(`${index + 1}. ${trigger.trigger_name}`);
        console.log(`   Table: ${trigger.event_object_table}`);
        console.log(`   Event: ${trigger.action_timing} ${trigger.event_manipulation}`);
        console.log(`   Action: ${trigger.action_statement.substring(0, 100)}...`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking triggers:', error);
    process.exit(1);
  }
}

checkTriggers();
