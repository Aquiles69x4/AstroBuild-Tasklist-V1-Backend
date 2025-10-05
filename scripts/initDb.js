const fs = require('fs');
const path = require('path');
const db = require('../database/db');

async function initializeDatabase() {
  try {
    console.log('Initializing SQLite database...');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Ejecutar el schema completo
    await db.exec(schema);

    // Agregar algunos carros de ejemplo
    console.log('Adding sample cars...');
    const sampleCars = [
      {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        license_plate: 'ABC-123',
        customer_name: 'Juan Pérez',
        customer_phone: '+1234567890'
      },
      {
        brand: 'Honda',
        model: 'Civic',
        year: 2019,
        license_plate: 'DEF-456',
        customer_name: 'María González',
        customer_phone: '+1234567891'
      },
      {
        brand: 'Ford',
        model: 'Focus',
        year: 2021,
        license_plate: 'GHI-789',
        customer_name: 'Carlos Ruiz',
        customer_phone: '+1234567892'
      }
    ];

    for (const car of sampleCars) {
      try {
        await db.query(
          'INSERT INTO cars (brand, model, year, repair_time, start_date) VALUES (?, ?, ?, ?, ?)',
          [car.brand, car.model, car.year, '2-3 horas', '2024-09-15']
        );
        console.log(`✓ Created car: ${car.brand} ${car.model}`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`- Car ${car.brand} ${car.model} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    // Agregar algunas tareas de ejemplo
    console.log('Adding sample tasks...');
    const sampleTasks = [
      {
        car_id: 1,
        title: 'Cambio de aceite',
        description: 'Cambio de aceite y filtro completo'
      },
      {
        car_id: 2,
        title: 'Reparación de frenos',
        description: 'Cambio de pastillas y discos de freno'
      },
      {
        car_id: 3,
        title: 'Revisión general',
        description: 'Revisión completa del motor y sistemas'
      },
      {
        car_id: 1,
        title: 'Cambio de llantas',
        description: 'Cambio de las 4 llantas por desgaste'
      }
    ];

    for (const task of sampleTasks) {
      try {
        await db.query(
          'INSERT INTO tasks (car_id, title, description) VALUES (?, ?, ?)',
          [task.car_id, task.title, task.description]
        );
        console.log(`✓ Created task: ${task.title}`);
      } catch (error) {
        console.log(`- Task creation error: ${error.message}`);
      }
    }

    console.log('\n🎉 Database initialized successfully!');
    console.log('📊 Database location: backend/data/astrobuild.db');
    console.log('🚗 Sample cars and tasks added for testing');
    console.log('✨ No login required - everyone can collaborate!');
    console.log('\nYou can now start the server with: npm run dev');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();