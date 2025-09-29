const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());

// Routes
const carsRoutes = require('../routes/cars');
const tasksRoutes = require('../routes/tasks');
const mechanicsRoutes = require('../routes/mechanics');

app.use('/api/cars', carsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/mechanics', mechanicsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running!' });
});

app.get('/api/stats', async (req, res) => {
  try {
    const db = require('../database/db');
    const carsResult = await db.query('SELECT COUNT(*) as count FROM cars');
    const tasksResult = await db.query('SELECT COUNT(*) as count FROM tasks');

    res.json({
      total_cars: carsResult.rows[0].count,
      total_tasks: tasksResult.rows[0].count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'AstroBuild Backend API' });
});

module.exports = app;