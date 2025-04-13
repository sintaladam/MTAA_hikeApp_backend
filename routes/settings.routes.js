import { Router } from 'express';
import pool from '../utils/db.js';
import CustomError from '../middleware/customError.js';

const settingsRouter = Router();

/**
 * @swagger
 * /settings/{userId}:
 *   get:
 *     summary: Get settings for a user
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Returns the user's settings
 *       404:
 *         description: Settings not found
 *       500:
 *         description: Database query failed
 */
settingsRouter.get('/:userId', async (req, res, next) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM user_schema.settings WHERE user_id = $1',
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

/**
 * @swagger
 * /settings:
 *   post:
 *     summary: Create settings for a user
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - dark_mode
 *               - accesability
 *               - language_id
 *             properties:
 *               user_id:
 *                 type: integer
 *               dark_mode:
 *                 type: boolean
 *               accesability:
 *                 type: boolean
 *               language_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Settings created
 *       400:
 *         description: Settings already exist for this user
 *       500:
 *         description: Failed to create settings
 */
settingsRouter.post('/', async (req, res, next) => {
  const { user_id, dark_mode, accesability, language_id } = req.body;

  try {
    const check = await pool.query(
      'SELECT * FROM user_schema.settings WHERE user_id = $1',
      [user_id]
    );

    if (check.rows.length > 0) {
      return next(new CustomError('Settings already exist for this user', 400));
    }

    const result = await pool.query(
      'INSERT INTO user_schema.settings (user_id, dark_mode, accesability, language_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, dark_mode, accesability, language_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating settings:', err);
    next(new CustomError('Failed to create settings', 500));
  }
});

/**
 * @swagger
 * /settings/{userId}:
 *   put:
 *     summary: Update settings for a user
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dark_mode
 *               - accesability
 *               - language_id
 *             properties:
 *               dark_mode:
 *                 type: boolean
 *               accesability:
 *                 type: boolean
 *               language_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       404:
 *         description: Settings not found
 *       500:
 *         description: Failed to update settings
 */
settingsRouter.put('/:userId', async (req, res, next) => {
  const { userId } = req.params;
  const { dark_mode, accesability, language_id } = req.body;

  try {
    const result = await pool.query(
      'UPDATE user_schema.settings SET dark_mode = $1, accesability = $2, language_id = $3 WHERE user_id = $4 RETURNING *',
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
