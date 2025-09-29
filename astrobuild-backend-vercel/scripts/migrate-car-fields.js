const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'astrobuild.db');

console.log('🔧 Starting car fields migration...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Run migrations in sequence
async function runMigration() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add new columns to cars table
      db.run(`ALTER TABLE cars ADD COLUMN repair_time TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Error adding repair_time column:', err.message);
          reject(err);
          return;
        }
        console.log('✅ repair_time column added or already exists');
      });

      db.run(`ALTER TABLE cars ADD COLUMN start_date TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Error adding start_date column:', err.message);
          reject(err);
          return;
        }
        console.log('✅ start_date column added or already exists');
      });

      // Remove old columns by creating a new table and copying data
      console.log('🔄 Removing old columns...');

      db.run(`CREATE TABLE IF NOT EXISTS cars_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        repair_time TEXT,
        start_date TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delivered')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('❌ Error creating new cars table:', err.message);
          reject(err);
          return;
        }
        console.log('✅ New cars table structure created');

        // Copy data from old table to new table
        db.run(`INSERT INTO cars_new (id, brand, model, year, repair_time, start_date, status, created_at, updated_at)
                SELECT id, brand, model, year,
                       COALESCE(repair_time, NULL) as repair_time,
                       COALESCE(start_date, NULL) as start_date,
                       status, created_at, updated_at
                FROM cars`, (err) => {
          if (err) {
            console.error('❌ Error copying data:', err.message);
            reject(err);
            return;
          }
          console.log('✅ Data copied to new table');

          // Drop old table and rename new one
          db.run(`DROP TABLE cars`, (err) => {
            if (err) {
              console.error('❌ Error dropping old table:', err.message);
              reject(err);
              return;
            }
            console.log('✅ Old table dropped');

            db.run(`ALTER TABLE cars_new RENAME TO cars`, (err) => {
              if (err) {
                console.error('❌ Error renaming table:', err.message);
                reject(err);
                return;
              }
              console.log('✅ Table renamed successfully');

              // Recreate indexes
              db.run(`CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status)`, (err) => {
                if (err) {
                  console.error('❌ Error creating index:', err.message);
                  reject(err);
                  return;
                }
                console.log('✅ Indexes recreated');

                // Recreate triggers
                db.run(`CREATE TRIGGER IF NOT EXISTS trigger_update_cars_timestamp
                    AFTER UPDATE ON cars
                    FOR EACH ROW
                    BEGIN
                        UPDATE cars SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                    END`, (err) => {
                  if (err) {
                    console.error('❌ Error creating trigger:', err.message);
                    reject(err);
                    return;
                  }
                  console.log('✅ Triggers recreated');
                  resolve();
                });
              });
            });
          });
        });
      });
    });
  });
}

runMigration()
  .then(() => {
    console.log('🎉 Car fields migration completed successfully!');
    console.log('📝 Changes made:');
    console.log('   - Removed: license_plate, customer_name, customer_phone');
    console.log('   - Added: repair_time, start_date');
    db.close();
  })
  .catch((err) => {
    console.error('💥 Migration failed:', err);
    db.close();
    process.exit(1);
  });