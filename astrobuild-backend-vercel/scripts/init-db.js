const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'astrobuild.db');
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

console.log('🔧 Initializing database with updated schema...');

// Remove existing database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️ Removed existing database');
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error creating database:', err.message);
    process.exit(1);
  }
  console.log('✅ Created new SQLite database');
});

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');

// Execute schema in a transaction to ensure proper order
db.serialize(() => {
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Error executing schema:', err.message);
      process.exit(1);
    }
    console.log('✅ Successfully executed schema');
    console.log('🎉 Database initialized with updated schema!');
    console.log('📝 New car fields: repair_time, start_date');
    console.log('🗑️ Removed fields: license_plate, customer_name, customer_phone');
    db.close();
  });
});