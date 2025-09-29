const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes (no authentication needed)
const carsRoutes = require('./routes/cars');
const tasksRoutes = require('./routes/tasks');
const mechanicsRoutes = require('./routes/mechanics');

app.use('/api/cars', carsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/mechanics', mechanicsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AstroBuild List API is running! (No login required) - Collaborative mode!' });
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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

global.io = io;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 AstroBuild List server running on port ${PORT}`);
  console.log(`📊 Real-time updates enabled with Socket.io`);
  console.log(`✨ No authentication required - collaborative mode!`);
});
