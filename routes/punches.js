const express = require('express');
const db = require('../database/db');

const router = express.Router();

// Get all punches (optionally filter by date or mechanic)
router.get('/', async (req, res) => {
  try {
    const { date, mechanic_name, status, limit, offset } = req.query;

    let query = 'SELECT * FROM punches WHERE 1=1';
    const params = [];

    if (date) {
      params.push(date);
      query += ` AND date = $${params.length}`;
    }

    if (mechanic_name) {
      params.push(mechanic_name);
      query += ` AND mechanic_name = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY punch_in DESC';

    // Add pagination if limit is provided
    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
    }

    if (offset) {
      params.push(parseInt(offset));
      query += ` OFFSET $${params.length}`;
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM punches WHERE 1=1';
    const countParams = [];

    if (date) {
      countParams.push(date);
      countQuery += ` AND date = $${countParams.length}`;
    }

    if (mechanic_name) {
      countParams.push(mechanic_name);
      countQuery += ` AND mechanic_name = $${countParams.length}`;
    }

    if (status) {
      countParams.push(status);
      countQuery += ` AND status = $${countParams.length}`;
    }

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);

    res.json({
      punches: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: limit ? parseInt(limit) : null,
      offset: offset ? parseInt(offset) : 0
    });
  } catch (error) {
    console.error('Error fetching punches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active punch for a mechanic (currently clocked in)
router.get('/active/:mechanic_name', async (req, res) => {
  try {
    const { mechanic_name } = req.params;

    const result = await db.query(
      `SELECT * FROM punches
       WHERE mechanic_name = $1 AND status = 'active'
       ORDER BY punch_in DESC
       LIMIT 1`,
      [mechanic_name]
    );

    if (result.rows.length === 0) {
      return res.json({ active: false, punch: null });
    }

    res.json({ active: true, punch: result.rows[0] });
  } catch (error) {
    console.error('Error fetching active punch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Punch in (clock in)
router.post('/punch-in', async (req, res) => {
  try {
    const { mechanic_name } = req.body;

    if (!mechanic_name) {
      return res.status(400).json({ error: 'mechanic_name is required' });
    }

    // Check if mechanic already has an active punch
    const activePunch = await db.query(
      'SELECT * FROM punches WHERE mechanic_name = $1 AND status = $2',
      [mechanic_name, 'active']
    );

    if (activePunch.rows.length > 0) {
      return res.status(400).json({
        error: 'Mechanic already has an active punch. Please punch out first.'
      });
    }

    // Create new punch
    const result = await db.query(
      `INSERT INTO punches (mechanic_name, punch_in, date, status)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_DATE, 'active')
       RETURNING *`,
      [mechanic_name]
    );

    // Emit socket event
    if (global.io) {
      global.io.emit('punch-added', result.rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error punching in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Punch out (clock out)
router.put('/punch-out/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Update punch with punch_out time (trigger will calculate hours)
    const result = await db.query(
      `UPDATE punches
       SET punch_out = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Punch not found' });
    }

    // Emit socket event
    if (global.io) {
      global.io.emit('punch-updated', result.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error punching out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all car work sessions
router.get('/car-sessions', async (req, res) => {
  try {
    const { date, mechanic_name, car_id } = req.query;

    let query = `
      SELECT cws.*, c.brand, c.model, c.year
      FROM car_work_sessions cws
      LEFT JOIN cars c ON cws.car_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      params.push(date);
      query += ` AND DATE(cws.start_time) = $${params.length}`;
    }

    if (mechanic_name) {
      params.push(mechanic_name);
      query += ` AND cws.mechanic_name = $${params.length}`;
    }

    if (car_id) {
      params.push(car_id);
      query += ` AND cws.car_id = $${params.length}`;
    }

    query += ' ORDER BY cws.start_time DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching car work sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active car work session for a mechanic
router.get('/car-sessions/active/:mechanic_name', async (req, res) => {
  try {
    const { mechanic_name } = req.params;

    const result = await db.query(
      `SELECT cws.*, c.brand, c.model, c.year
       FROM car_work_sessions cws
       LEFT JOIN cars c ON cws.car_id = c.id
       WHERE cws.mechanic_name = $1 AND cws.end_time IS NULL
       ORDER BY cws.start_time DESC
       LIMIT 1`,
      [mechanic_name]
    );

    if (result.rows.length === 0) {
      return res.json({ active: false, session: null });
    }

    res.json({ active: true, session: result.rows[0] });
  } catch (error) {
    console.error('Error fetching active car session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start work on a car
router.post('/car-sessions/start', async (req, res) => {
  try {
    const { punch_id, car_id, mechanic_name, notes } = req.body;

    if (!punch_id || !car_id || !mechanic_name) {
      return res.status(400).json({
        error: 'punch_id, car_id, and mechanic_name are required'
      });
    }

    // Verify punch exists (can be active or completed)
    const punchCheck = await db.query(
      'SELECT * FROM punches WHERE id = $1',
      [punch_id]
    );

    if (punchCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Punch not found.'
      });
    }

    // Only check for active sessions if the punch is still active
    if (punchCheck.rows[0].status === 'active') {
      const activeSession = await db.query(
        'SELECT * FROM car_work_sessions WHERE mechanic_name = $1 AND end_time IS NULL',
        [mechanic_name]
      );

      if (activeSession.rows.length > 0) {
        return res.status(400).json({
          error: 'Mechanic already working on another car. Please end current session first.'
        });
      }
    }

    // Create new car work session
    const result = await db.query(
      `INSERT INTO car_work_sessions (punch_id, car_id, mechanic_name, notes, start_time)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [punch_id, car_id, mechanic_name, notes || null]
    );

    // Emit socket event
    if (global.io) {
      global.io.emit('car-session-started', result.rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error starting car work session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End work on a car
router.put('/car-sessions/end/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, total_hours } = req.body;
    console.log('Ending car session:', id, 'notes:', notes, 'total_hours:', total_hours);

    // Update session with end_time and optionally total_hours (if provided from distribution)
    let query, params;

    if (total_hours !== undefined && total_hours !== null) {
      // If total_hours is provided (from time distribution), use it directly
      query = `UPDATE car_work_sessions
               SET end_time = CURRENT_TIMESTAMP, notes = COALESCE($2, notes), total_hours = $3
               WHERE id = $1
               RETURNING *`;
      params = [id, notes || null, total_hours];
    } else {
      // Otherwise let the trigger calculate from start_time to end_time
      query = `UPDATE car_work_sessions
               SET end_time = CURRENT_TIMESTAMP, notes = COALESCE($2, notes)
               WHERE id = $1
               RETURNING *`;
      params = [id, notes || null];
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car work session not found' });
    }

    // Emit socket event
    if (global.io) {
      global.io.emit('car-session-ended', result.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error ending car work session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get summary for payroll (total hours by mechanic)
router.get('/summary/payroll', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        mechanic_name,
        COUNT(*) as total_days,
        SUM(total_hours) as total_hours,
        AVG(total_hours) as avg_hours_per_day,
        MIN(date) as first_day,
        MAX(date) as last_day
      FROM punches
      WHERE status = 'completed'
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND date <= $${params.length}`;
    }

    query += ' GROUP BY mechanic_name ORDER BY total_hours DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payroll summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get summary for car costs (total hours by car)
router.get('/summary/car-costs', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        cws.car_id,
        c.brand,
        c.model,
        c.year,
        COUNT(DISTINCT cws.mechanic_name) as mechanics_count,
        SUM(cws.total_hours) as total_hours,
        COUNT(*) as sessions_count
      FROM car_work_sessions cws
      LEFT JOIN cars c ON cws.car_id = c.id
      WHERE cws.end_time IS NOT NULL
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND DATE(cws.start_time) >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND DATE(cws.start_time) <= $${params.length}`;
    }

    query += ' GROUP BY cws.car_id, c.brand, c.model, c.year ORDER BY total_hours DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching car costs summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mechanic-car hours breakdown (for accumulated hours display)
router.get('/summary/mechanic-cars', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Get all mechanics with their last reset date
    const mechanics = await db.query('SELECT name, last_reset_date FROM mechanics');

    // Build result for each mechanic
    const result = [];

    for (const mechanic of mechanics.rows) {
      // First get car sessions grouped by car for this mechanic
      let sessionQuery = `
        SELECT
          cws.car_id,
          c.brand,
          c.model,
          c.year,
          SUM(cws.total_hours) as total_hours
        FROM car_work_sessions cws
        LEFT JOIN cars c ON cws.car_id = c.id
        WHERE cws.end_time IS NOT NULL
        AND cws.mechanic_name = $1
      `;
      const params = [mechanic.name];

      // Filter by reset date if exists
      if (mechanic.last_reset_date) {
        params.push(mechanic.last_reset_date);
        sessionQuery += ` AND cws.start_time > $${params.length}`;
      }

      if (start_date) {
        params.push(start_date);
        sessionQuery += ` AND DATE(cws.start_time) >= $${params.length}`;
      }

      if (end_date) {
        params.push(end_date);
        sessionQuery += ` AND DATE(cws.start_time) <= $${params.length}`;
      }

      sessionQuery += ' GROUP BY cws.car_id, c.brand, c.model, c.year ORDER BY total_hours DESC';

      const sessions = await db.query(sessionQuery, params);

      const total_hours = sessions.rows.reduce((sum, s) => sum + parseFloat(s.total_hours || 0), 0);

      result.push({
        mechanic_name: mechanic.name,
        total_hours,
        cars: sessions.rows.map(s => ({
          car_id: s.car_id,
          brand: s.brand,
          model: s.model,
          year: s.year,
          total_hours: parseFloat(s.total_hours || 0)
        }))
      });
    }

    // Sort by total hours descending
    result.sort((a, b) => b.total_hours - a.total_hours);

    res.json(result);
  } catch (error) {
    console.error('Error fetching mechanic-car summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get individual car work sessions for a mechanic (for editing)
router.get('/summary/mechanic-sessions/:mechanic_name', async (req, res) => {
  try {
    const { mechanic_name } = req.params;
    const { start_date, end_date } = req.query;

    // Get mechanic's last reset date
    const mechanicResult = await db.query('SELECT last_reset_date FROM mechanics WHERE name = $1', [mechanic_name]);
    const lastResetDate = mechanicResult.rows[0]?.last_reset_date;

    // Get individual sessions
    let sessionQuery = `
      SELECT
        cws.id,
        cws.car_id,
        cws.total_hours,
        c.brand,
        c.model,
        c.year
      FROM car_work_sessions cws
      LEFT JOIN cars c ON cws.car_id = c.id
      WHERE cws.end_time IS NOT NULL
      AND cws.mechanic_name = $1
    `;
    const params = [mechanic_name];

    // Filter by reset date if exists
    if (lastResetDate) {
      params.push(lastResetDate);
      sessionQuery += ` AND cws.start_time > $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      sessionQuery += ` AND DATE(cws.start_time) >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      sessionQuery += ` AND DATE(cws.start_time) <= $${params.length}`;
    }

    sessionQuery += ' ORDER BY cws.car_id, cws.start_time DESC';

    const result = await db.query(sessionQuery, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mechanic sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset hours for a mechanic (mark as paid)
router.post('/reset-hours/:mechanic_name', async (req, res) => {
  try {
    const { mechanic_name } = req.params;

    // Update mechanic's last_reset_date to now
    await db.query(
      'UPDATE mechanics SET last_reset_date = CURRENT_TIMESTAMP WHERE name = $1',
      [mechanic_name]
    );

    // Emit socket event
    if (global.io) {
      global.io.emit('hours-reset', { mechanic_name });
    }

    res.json({ message: 'Hours reset successfully', mechanic_name });
  } catch (error) {
    console.error('Error resetting hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset all hours (mark all as paid)
router.post('/reset-hours', async (req, res) => {
  try {
    // Update all mechanics' last_reset_date to now
    await db.query('UPDATE mechanics SET last_reset_date = CURRENT_TIMESTAMP');

    // Emit socket event
    if (global.io) {
      global.io.emit('all-hours-reset');
    }

    res.json({ message: 'All hours reset successfully' });
  } catch (error) {
    console.error('Error resetting all hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset all car hours (delete all completed work sessions)
router.post('/reset-car-hours', async (req, res) => {
  try {
    const { password } = req.body;

    // Verify password
    if (password !== 'hola123') {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Delete all completed car work sessions
    const result = await db.query('DELETE FROM car_work_sessions WHERE end_time IS NOT NULL');

    // Emit socket event
    if (global.io) {
      global.io.emit('car-hours-reset');
    }

    res.json({
      message: 'All car hours reset successfully',
      deleted_sessions: result.rowCount
    });
  } catch (error) {
    console.error('Error resetting car hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update total hours for a specific car
router.put('/car-hours/:car_id', async (req, res) => {
  try {
    const { car_id } = req.params;
    const { total_hours, password } = req.body;

    // Verify password
    if (password !== 'hola123') {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get current total hours for this car
    const currentResult = await db.query(
      'SELECT SUM(total_hours) as current_total FROM car_work_sessions WHERE car_id = $1 AND end_time IS NOT NULL',
      [car_id]
    );

    const currentTotal = parseFloat(currentResult.rows[0]?.current_total || 0);
    const newTotal = parseFloat(total_hours);

    if (currentTotal === 0) {
      // If there are no sessions, we can't update anything
      return res.json({
        message: 'No hay sesiones de trabajo para actualizar',
        car_id: parseInt(car_id),
        old_total: 0,
        new_total: 0,
        ratio: 0
      });
    }

    // Calculate the ratio to adjust all sessions proportionally
    const ratio = newTotal / currentTotal;

    // Update all sessions for this car proportionally
    await db.query(
      'UPDATE car_work_sessions SET total_hours = total_hours * $1 WHERE car_id = $2 AND end_time IS NOT NULL',
      [ratio, car_id]
    );

    // Emit socket event
    if (global.io) {
      global.io.emit('car-hours-updated', { car_id, new_total: newTotal });
    }

    res.json({
      message: 'Car hours updated successfully',
      car_id: parseInt(car_id),
      old_total: currentTotal,
      new_total: newTotal,
      ratio
    });
  } catch (error) {
    console.error('Error updating car hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update punch times (admin function)
router.put('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { punch_in, punch_out, password } = req.body;

    // Verify password
    if (password !== 'hola123') {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Validate that punch_in is provided
    if (!punch_in) {
      return res.status(400).json({ error: 'punch_in is required' });
    }

    // Validate that punch_out is after punch_in if provided
    if (punch_out && new Date(punch_out) <= new Date(punch_in)) {
      return res.status(400).json({ error: 'punch_out must be after punch_in' });
    }

    // Build update query
    let query = 'UPDATE punches SET punch_in = $1';
    const params = [punch_in];

    if (punch_out) {
      params.push(punch_out);
      query += `, punch_out = $${params.length}`;
      // Calculate total_hours
      query += `, total_hours = EXTRACT(EPOCH FROM ($${params.length}::timestamp - $1::timestamp)) / 3600`;
      query += `, status = 'completed'`;
    } else {
      // If no punch_out, set it to NULL and status to active
      query += ', punch_out = NULL, total_hours = NULL, status = \'active\'';
    }

    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING *`;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Punch not found' });
    }

    // Emit socket event
    if (global.io) {
      global.io.emit('punch-updated', result.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating punch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete all punches and car work sessions (admin function - for reset/cleanup)
// MUST BE BEFORE /:id route
router.delete('/delete-all', async (req, res) => {
  try {
    const { password } = req.body;

    // Verify password
    if (password !== 'hola123') {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Delete all car work sessions first (foreign key constraint)
    const sessionsResult = await db.query('DELETE FROM car_work_sessions RETURNING id');
    const punchesResult = await db.query('DELETE FROM punches RETURNING id');

    // Reset all mechanics' last_reset_date
    await db.query('UPDATE mechanics SET last_reset_date = CURRENT_TIMESTAMP');

    // Emit socket event
    if (global.io) {
      global.io.emit('all-data-cleared');
    }

    res.json({
      message: 'All punches and car work sessions deleted successfully',
      deleted_sessions: sessionsResult.rows.length,
      deleted_punches: punchesResult.rows.length
    });
  } catch (error) {
    console.error('Error deleting all data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete punch (admin function)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM punches WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Punch not found' });
    }

    // Emit socket event
    if (global.io) {
      global.io.emit('punch-deleted', { id });
    }

    res.json({ message: 'Punch deleted successfully', punch: result.rows[0] });
  } catch (error) {
    console.error('Error deleting punch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update car work session hours (admin function)
router.put('/car-sessions/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { total_hours, password } = req.body;

    // Verify password
    if (password !== 'hola123') {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Validate total_hours
    if (total_hours === undefined || total_hours === null || total_hours < 0) {
      return res.status(400).json({ error: 'Las horas deben ser un número positivo' });
    }

    // Update the car work session
    const result = await db.query(
      'UPDATE car_work_sessions SET total_hours = $1 WHERE id = $2 RETURNING *',
      [total_hours, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión de trabajo no encontrada' });
    }

    // Emit socket event
    if (global.io) {
      global.io.emit('car-session-updated', result.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating car session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
