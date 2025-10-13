const db = require('../database/db');

async function forceRemoveTrigger() {
  try {
    console.log('🔧 Force removing trigger_update_mechanic_points...\n');

    // Drop the trigger
    await db.query('DROP TRIGGER IF EXISTS trigger_update_mechanic_points ON tasks CASCADE');
    console.log('✅ Dropped trigger_update_mechanic_points');

    // Drop the function
    await db.query('DROP FUNCTION IF EXISTS update_mechanic_points() CASCADE');
    console.log('✅ Dropped function update_mechanic_points()');

    console.log('\n🔍 Verifying removal...\n');

    // Check triggers again
    const triggers = await db.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND trigger_name = 'trigger_update_mechanic_points';
    `);

    if (triggers.rows.length === 0) {
      console.log('✅ SUCCESS: trigger_update_mechanic_points has been removed!\n');
    } else {
      console.log('❌ WARNING: Trigger still exists!');
      console.log(triggers.rows);
    }

    // Check functions
    const functions = await db.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'update_mechanic_points';
    `);

    if (functions.rows.length === 0) {
      console.log('✅ SUCCESS: update_mechanic_points() function has been removed!\n');
    } else {
      console.log('❌ WARNING: Function still exists!');
      console.log(functions.rows);
    }

    console.log('✅ All done! The trigger has been permanently removed.\n');
    console.log('⚠️  NOTE: You should now reset mechanic points using reset-points.js\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

forceRemoveTrigger();
