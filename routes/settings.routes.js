import { Router } from 'express';
import pool from '../db.js';
import CustomError from '../middleware/customError.js';

const settingsRouter = Router();

// GET settings
settingsRouter.get('/:userId', async (req, res, next) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return next(new CustomError('Settings not found', 404));
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching settings:', err);
    next(new CustomError('Database query failed', 500));
  }
});

// CREATE settings
settingsRouter.post('/', async (req, res, next) => {
  const { user_id, dark_mode, accesability, language_id } = req.body;

  try {
    const check = await pool.query('SELECT * FROM settings WHERE user_id = $1', [user_id]);

    if (check.rows.length > 0) {
      return next(new CustomError('Settings already exist for this user', 400));
    }

    const result = await pool.query(
      'INSERT INTO settings (user_id, dark_mode, accesability, language_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, dark_mode, accesability, language_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating settings:', err);
    next(new CustomError('Failed to create settings', 500));
  }
});

// UPDATE settings
settingsRouter.put('/:userId', async (req, res, next) => {
  const { userId } = req.params;
  const { dark_mode, accesability, language_id } = req.body;

  try {
    const result = await pool.query(
      'UPDATE settings SET dark_mode = $1, accesability = $2, language_id = $3 WHERE user_id = $4 RETURNING *',
      [dark_mode, accesability, language_id, userId]
    );

    if (result.rows.length === 0) {
      return next(new CustomError('Settings not found', 404));
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating settings:', err);
    next(new CustomError('Failed to update settings', 500));
  }
});

export default settingsRouter;
