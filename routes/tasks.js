const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

const router = express.Router();

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const { status, car_id } = req.query;
    let query = `
      SELECT t.*, c.brand, c.model, c.year
      FROM tasks t
      LEFT JOIN cars c ON t.car_id = c.id
    `;
    let params = [];
    let conditions = [];

    if (status) {
      conditions.push(`t.status = $${params.length + 1}`);
      params.push(status);
    }

    if (car_id) {
      conditions.push(`t.car_id = $${params.length + 1}`);
      params.push(car_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.is_priority DESC, t.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get priority tasks (red flags)
router.get('/priority/list', async (req, res) => {
  try {
    const query = `
      SELECT t.*, c.brand, c.model, c.year
      FROM tasks t
      LEFT JOIN cars c ON t.car_id = c.id
      WHERE t.is_priority = 1 AND t.status != 'completed'
      ORDER BY t.created_at DESC
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching priority tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single task
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT t.*, c.brand, c.model, c.year
      FROM tasks t
      LEFT JOIN cars c ON t.car_id = c.id
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new task
router.post('/',
  [
    body('car_id').isInt().withMessage('Valid car ID is required'),
    body('title').notEmpty().withMessage('Title is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { car_id, title, description, assigned_mechanic, points = 1, is_priority = 0 } = req.body;

      // Check if car exists
      const carExists = await db.query('SELECT id FROM cars WHERE id = $1', [car_id]);
      if (carExists.rows.length === 0) {
        return res.status(400).json({ error: 'Car not found' });
      }

      const result = await db.query(
        'INSERT INTO tasks (car_id, title, description, assigned_mechanic, points, is_priority) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [car_id, title, description || null, assigned_mechanic || null, points, is_priority ? 1 : 0]
      );

      // Get the created task with car details
      const taskWithDetails = await db.query(`
        SELECT t.*, c.brand, c.model, c.year
        FROM tasks t
        LEFT JOIN cars c ON t.car_id = c.id
        WHERE t.id = $1
      `, [result.rows[0].id]);

      const newTask = taskWithDetails.rows[0];

      // Notify all clients
      if (global.io) {
        global.io.emit('task-added', newTask);
      }

      res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update task
router.put('/:id',
  [
    body('status').optional().isIn(['pending', 'in_progress', 'completed']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateFields = req.body;

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Get the task before updating to check previous state
      const previousTask = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (previousTask.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      const oldTask = previousTask.rows[0];

      // Handle 2-mechanic logic manually
      let twoMechanics = [];
      if (updateFields.assigned_mechanic && updateFields.assigned_mechanic.includes(',')) {
        twoMechanics = updateFields.assigned_mechanic.split(',').map(m => m.trim());
        console.log('Two mechanics detected:', twoMechanics);
      }

      const fieldNames = Object.keys(updateFields);
      await db.query(
        `UPDATE tasks SET ${fieldNames.map((field, index) => `${field} = $${index + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fieldNames.length + 1}`,
        [...Object.values(updateFields), id]
      );

      // If task is being completed with 2 mechanics, manually update points
      if (updateFields.status === 'completed' && oldTask.status !== 'completed' && twoMechanics.length === 2) {
        const pointsPerMechanic = oldTask.points / 2;
        console.log(`Dividing ${oldTask.points} points between 2 mechanics: ${pointsPerMechanic} each`);

        for (const mechanicName of twoMechanics) {
          await db.query(`
            UPDATE mechanics
            SET total_points = total_points + $1,
                total_tasks = total_tasks + 1
            WHERE name = $2
          `, [pointsPerMechanic, mechanicName]);
          console.log(`Updated ${mechanicName} with ${pointsPerMechanic} points`);
        }
      }
      // If task is being uncompleted with 2 mechanics, remove points
      else if (oldTask.status === 'completed' && updateFields.status !== 'completed' && oldTask.assigned_mechanic && oldTask.assigned_mechanic.includes(',')) {
        const previousMechanics = oldTask.assigned_mechanic.split(',').map(m => m.trim());
        const pointsPerMechanic = oldTask.points / 2;
        console.log(`Removing ${oldTask.points} points from 2 mechanics: ${pointsPerMechanic} each`);

        for (const mechanicName of previousMechanics) {
          await db.query(`
            UPDATE mechanics
            SET total_points = total_points - $1,
                total_tasks = total_tasks - 1
            WHERE name = $2
          `, [pointsPerMechanic, mechanicName]);
          console.log(`Removed ${pointsPerMechanic} points from ${mechanicName}`);
        }
      }

      // Get the updated task with car details
      const result = await db.query(`
        SELECT t.*, c.brand, c.model, c.year
        FROM tasks t
        LEFT JOIN cars c ON t.car_id = c.id
        WHERE t.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const updatedTask = result.rows[0];

      // Notify all clients
      if (global.io) {
        global.io.emit('task-updated', updatedTask);
      }

      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM tasks WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Notify all clients
    if (global.io) {
      global.io.emit('task-deleted', { id: parseInt(id) });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;