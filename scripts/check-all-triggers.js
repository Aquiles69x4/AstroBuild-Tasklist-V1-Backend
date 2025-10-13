const db = require('../database/db');

async function checkAllTriggers() {
  try {
    console.log('🔍 Comprehensive Trigger and Rule Check\n');

    // Check all triggers
    console.log('=== ALL TRIGGERS ===');
    const triggers = await db.query(`
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing,
        action_orientation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `);

    if (triggers.rows.length === 0) {
      console.log('✅ No triggers found\n');
    } else {
      console.log(`Found ${triggers.rows.length} trigger(s):\n`);
      triggers.rows.forEach((trigger, index) => {
        console.log(`${index + 1}. ${trigger.trigger_name}`);
        console.log(`   Table: ${trigger.event_object_table}`);
        console.log(`   Event: ${trigger.action_timing} ${trigger.event_manipulation}`);
        console.log(`   Orientation: ${trigger.action_orientation}`);
        console.log(`   Action: ${trigger.action_statement}`);
        console.log('');
      });
    }

    // Check all rules
    console.log('=== POSTGRESQL RULES ===');
    const rules = await db.query(`
      SELECT
        schemaname,
        tablename,
        rulename,
        definition
      FROM pg_rules
      WHERE schemaname = 'public'
      ORDER BY tablename, rulename;
    `);

    if (rules.rows.length === 0) {
      console.log('✅ No custom rules found\n');
    } else {
      console.log(`Found ${rules.rows.length} rule(s):\n`);
      rules.rows.forEach((rule, index) => {
        console.log(`${index + 1}. ${rule.rulename} on ${rule.tablename}`);
        console.log(`   Definition: ${rule.definition}`);
        console.log('');
      });
    }

    // Check for functions that might be called
    console.log('=== MECHANIC-RELATED FUNCTIONS ===');
    const functions = await db.query(`
      SELECT
        routine_name,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND (
          routine_name LIKE '%mechanic%'
          OR routine_name LIKE '%point%'
          OR routine_name LIKE '%task%'
        )
      ORDER BY routine_name;
    `);

    if (functions.rows.length === 0) {
      console.log('✅ No mechanic-related functions found\n');
    } else {
      console.log(`Found ${functions.rows.length} function(s):\n`);
      functions.rows.forEach((func, index) => {
        console.log(`${index + 1}. ${func.routine_name}()`);
        console.log(`   Definition: ${func.routine_definition || 'N/A'}`);
        console.log('');
      });
    }

    // Check current mechanic points
    console.log('=== CURRENT MECHANIC POINTS ===');
    const mechanics = await db.query(`
      SELECT name, total_points, total_tasks
      FROM mechanics
      ORDER BY name;
    `);

    mechanics.rows.forEach(m => {
      console.log(`${m.name}: ${m.total_points} points, ${m.total_tasks} tasks`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

checkAllTriggers();
