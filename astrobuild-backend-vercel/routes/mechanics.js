const express = require('express');
const db = require('../database/db');

const router = express.Router();

// Get all mechanics with their rankings
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        name,
        total_points,
        total_tasks,
        created_at,
        updated_at
      FROM mechanics
      ORDER BY total_points DESC, name ASC
    `);

    // Add ranking position
    const mechanicsWithRanking = result.rows.map((mechanic, index) => ({
      ...mechanic,
      rank: index + 1
    }));

    res.json(mechanicsWithRanking);
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leaderboard (top mechanics)
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await db.query(`
      SELECT
        name,
        total_points,
        total_tasks,
        updated_at
      FROM mechanics
      WHERE total_points > 0
      ORDER BY total_points DESC, total_tasks DESC, name ASC
      LIMIT $1
    `, [parseInt(limit)]);

    // Add ranking and medals
    const leaderboard = result.rows.map((mechanic, index) => {
      let medal = '';
      if (index === 0) medal = '🥇';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';

      return {
        ...mechanic,
        rank: index + 1,
        medal
      };
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mechanic stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        COUNT(*) as total_mechanics,
        SUM(total_points) as total_points_awarded,
        SUM(total_tasks) as total_tasks_completed,
        AVG(total_points) as avg_points_per_mechanic,
        MAX(total_points) as highest_score
      FROM mechanics
    `);

    const topMechanic = await db.query(`
      SELECT name, total_points
      FROM mechanics
      WHERE total_points = (SELECT MAX(total_points) FROM mechanics)
      LIMIT 1
    `);

    res.json({
      ...stats.rows[0],
      top_mechanic: topMechanic.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching mechanic stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific mechanic details
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const mechanic = await db.query(`
      SELECT * FROM mechanics WHERE name = $1
    `, [name]);

    if (mechanic.rows.length === 0) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    // Get recent tasks for this mechanic
    const recentTasks = await db.query(`
      SELECT
        t.id,
        t.title,
        t.points,
        t.completed_at,
        c.brand,
        c.model,
        c.license_plate
      FROM tasks t
      LEFT JOIN cars c ON t.car_id = c.id
      WHERE t.assigned_mechanic = $1 AND t.status = 'completed'
      ORDER BY t.completed_at DESC
      LIMIT 10
    `, [name]);

    res.json({
      ...mechanic.rows[0],
      recent_tasks: recentTasks.rows
    });
  } catch (error) {
    console.error('Error fetching mechanic details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;