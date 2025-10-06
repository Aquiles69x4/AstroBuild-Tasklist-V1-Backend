const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

const router = express.Router();

// Get all cars
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM cars';
    let params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY display_order ASC NULLS LAST, created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cars:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single car
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM cars WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching car:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new car
router.post('/',
  [
    body('brand').notEmpty().withMessage('Brand is required'),
    body('model').notEmpty().withMessage('Model is required'),
    body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { brand, model, year, repair_time, start_date } = req.body;

      const result = await db.query(
        'INSERT INTO cars (brand, model, year, repair_time, start_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [brand, model, year, repair_time || null, start_date || null]
      );

      // Get the created car
      const newCarResult = await db.query('SELECT * FROM cars WHERE id = $1', [result.rows[0].id]);
      const newCar = newCarResult.rows[0];

      // Notify all clients
      if (global.io) {
        global.io.emit('car-added', newCar);
      }

      res.status(201).json(newCar);
    } catch (error) {
      console.error('Error creating car:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update car
router.put('/:id',
  [
    body('brand').optional().notEmpty().withMessage('Brand cannot be empty'),
    body('model').optional().notEmpty().withMessage('Model cannot be empty'),
    body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'delivered']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updateFields = req.body;

      const fieldNames = Object.keys(updateFields);

      await db.query(
        `UPDATE cars SET ${fieldNames.map((field, index) => `${field} = $${index + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fieldNames.length + 1}`,
        [...Object.values(updateFields), id]
      );

      // Get the updated car
      const result = await db.query('SELECT * FROM cars WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Car not found' });
      }

      const updatedCar = result.rows[0];

      // Notify all clients
      if (global.io) {
        global.io.emit('car-updated', updatedCar);
      }

      res.json(updatedCar);
    } catch (error) {
      console.error('Error updating car:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete car
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM cars WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Notify all clients
    if (global.io) {
      global.io.emit('car-deleted', { id: parseInt(id) });
    }

    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    console.error('Error deleting car:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Move car up or down in display order
router.put('/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body;

    if (!['up', 'down'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction. Must be "up" or "down"' });
    }

    // Get current car
    const currentCar = await db.query('SELECT * FROM cars WHERE id = $1', [id]);
    if (currentCar.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const currentOrder = currentCar.rows[0].display_order;

    // Get adjacent car
    const adjacentQuery = direction === 'up'
      ? 'SELECT * FROM cars WHERE display_order < $1 ORDER BY display_order DESC LIMIT 1'
      : 'SELECT * FROM cars WHERE display_order > $1 ORDER BY display_order ASC LIMIT 1';

    const adjacentCar = await db.query(adjacentQuery, [currentOrder]);

    if (adjacentCar.rows.length === 0) {
      return res.json({ message: 'Car is already at the boundary' });
    }

    const adjacentOrder = adjacentCar.rows[0].display_order;

    // Swap display_order values
    await db.query('UPDATE cars SET display_order = $1 WHERE id = $2', [adjacentOrder, id]);
    await db.query('UPDATE cars SET display_order = $1 WHERE id = $2', [currentOrder, adjacentCar.rows[0].id]);

    // Get updated car
    const updatedCar = await db.query('SELECT * FROM cars WHERE id = $1', [id]);

    // Notify all clients
    if (global.io) {
      global.io.emit('car-moved', { id: parseInt(id), direction });
    }

    res.json({ message: 'Car moved successfully', car: updatedCar.rows[0] });
  } catch (error) {
    console.error('Error moving car:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;