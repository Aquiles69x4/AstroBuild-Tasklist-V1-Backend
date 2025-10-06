const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
  "https://astro-build-tasklist-frontend-30-2a.vercel.app"
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Make io available globally for routes
global.io = io;

const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes (no authentication needed)
const carsRoutes = require('./routes/cars');
const tasksRoutes = require('./routes/tasks');
const mechanicsRoutes = require('./routes/mechanics');
const punchesRoutes = require('./routes/punches');

app.use('/api/cars', carsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/mechanics', mechanicsRoutes);
app.use('/api/punches', punchesRoutes);

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
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚗 AstroBuild List server running on port ${PORT}`);
    console.log(`✨ No authentication required - collaborative mode!`);
    console.log(`🔌 Socket.IO enabled for real-time updates`);
  });
}