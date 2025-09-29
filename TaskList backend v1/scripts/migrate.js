const db = require('../database/db');

async function migrate() {
  try {
    console.log('Starting database migration...');

    // Create mechanics table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS mechanics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        total_points INTEGER DEFAULT 0,
        total_tasks INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert predefined mechanics
    await db.exec(`
      INSERT OR IGNORE INTO mechanics (name) VALUES
        ('IgenieroErick'),
        ('ChristianCobra'),
        ('Chicanto'),
        ('SpiderSteven'),
        ('LaBestiaPelua'),
        ('PhonKing'),
        ('CarlosMariconGay');
    `);

    // Add new columns to tasks table if they don't exist
    try {
      await db.exec('ALTER TABLE tasks ADD COLUMN assigned_mechanic TEXT REFERENCES mechanics(name);');
    } catch (e) {
      // Column might already exist
      console.log('assigned_mechanic column already exists or error:', e.message);
    }

    try {
      await db.exec('ALTER TABLE tasks ADD COLUMN points INTEGER DEFAULT 1;');
    } catch (e) {
      // Column might already exist
      console.log('points column already exists or error:', e.message);
    }

    // Create indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_mechanic ON tasks(assigned_mechanic);
      CREATE INDEX IF NOT EXISTS idx_mechanics_points ON mechanics(total_points DESC);
    `);

    // Create triggers for mechanics timestamp updates
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS trigger_update_mechanics_timestamp
        AFTER UPDATE ON mechanics
        FOR EACH ROW
        BEGIN
          UPDATE mechanics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    // Create triggers for automatic point calculation
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS trigger_add_points_on_completion
        AFTER UPDATE OF status ON tasks
        FOR EACH ROW
        WHEN NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_mechanic IS NOT NULL
        BEGIN
          UPDATE mechanics
          SET total_points = total_points + COALESCE(NEW.points, 1),
              total_tasks = total_tasks + 1
          WHERE name = NEW.assigned_mechanic;
        END;
    `);

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS trigger_remove_points_on_uncompletion
        AFTER UPDATE OF status ON tasks
        FOR EACH ROW
        WHEN OLD.status = 'completed' AND NEW.status != 'completed' AND NEW.assigned_mechanic IS NOT NULL
        BEGIN
          UPDATE mechanics
          SET total_points = total_points - COALESCE(NEW.points, 1),
              total_tasks = total_tasks - 1
          WHERE name = NEW.assigned_mechanic;
        END;
    `);

    console.log('Migration completed successfully!');
    console.log('Mechanics table created and populated.');
    console.log('Tasks table updated with mechanic assignment and points.');
    console.log('Triggers created for automatic point calculation.');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();