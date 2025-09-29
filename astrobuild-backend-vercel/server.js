const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());

// Routes (no authentication needed)
const carsRoutes = require('./routes/cars');
const tasksRoutes = require('./routes/tasks');
const mechanicsRoutes = require('./routes/mechanics');

app.use('/api/cars', carsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/mechanics', mechanicsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AstroBuild List API is running! (No login required)' });
});

app.get('/api/stats', async (req, res) => {
  try {
    const db = require('./database/db');

    const carsResult = await db.query('SELECT COUNT(*) as count FROM cars');
    const tasksResult = await db.query('SELECT COUNT(*) as count FROM tasks');
    const completedTasksResult = await db.query('SELECT COUNT(*) as count FROM tasks WHERE status = \'completed\'');
    const pendingTasksResult = await db.query('SELECT COUNT(*) as count FROM tasks WHERE status = \'pending\'');
    const inProgressTasksResult = await db.query('SELECT COUNT(*) as count FROM tasks WHERE status = \'in_progress\'');

    res.json({
      total_cars: carsResult.rows[0].count,
      total_tasks: tasksResult.rows[0].count,
      completed_tasks: completedTasksResult.rows[0].count,
      pending_tasks: pendingTasksResult.rows[0].count,
      in_progress_tasks: inProgressTasksResult.rows[0].count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: 'AstroBuild Backend API',
    endpoints: {
      health: '/api/health',
      stats: '/api/stats',
      cars: '/api/cars',
      tasks: '/api/tasks',
      mechanics: '/api/mechanics'
    }
  });
});

// Para Vercel serverless functions
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Para desarrollo local
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚗 AstroBuild List server running on port ${PORT}`);
    console.log(`✨ No authentication required - collaborative mode!`);
  });
}