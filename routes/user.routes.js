import { Router } from "express";
import pool from '../utils/db.js';
import CustomError from '../middleware/customError.js';
import jwt from 'jsonwebtoken';
import { authenticateFirebaseToken } from '../middleware/firebaseAuth.js';
import { query, validationResult } from 'express-validator';

const userRouter = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: A list of users
 *       500:
 *         description: Database query failed
 */
userRouter.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM user_schema.users`);
    res.status(200).json({ title: "results:", body: result.rows });
  } catch (err) {
    console.error('DB query error:', err);
    next(new CustomError('Database query failed', 500));
  }
});

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search for a user by ID or email
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: User email (partial match supported)
 *     responses:
 *       200:
 *         description: User found
 *       400:
 *         description: Either ID or email must be provided
 *       404:
 *         description: User not found
 *       500:
 *         description: Database query failed
 */
userRouter.get('/search',authenticateFirebaseToken, async (req, res, next) => {
  const { id, email } = req.query;

  if (!id && !email) {
    return next(new CustomError('Either ID or email must be provided', 400));
  }

  let query = 'SELECT * FROM user_schema.users WHERE ';
  let searchParam;

  if (id) {
    query += 'id = $1';
    searchParam = id;
  } else if (email) {
    query += 'email ILIKE $1';
    searchParam = `%${email}%`;
  }

  try {
    const result = await pool.query(query, [searchParam]);
    if (result.rows.length === 0) {
      return next(new CustomError('User not found', 404));
    }
    res.status(200).json({ result: 'all good', body: result.rows });
  } catch (err) {
    console.error('Error message: ' + err);
    next(new CustomError('Database query failed', 500));
  }
});


userRouter.get('/smart-search', authenticateFirebaseToken, [
  query('term')
    .exists().withMessage('search term is required')
    .trim()
    .notEmpty().withMessage('search term cannot be empty')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { term, excludeId } = req.query;
  const searchTerm = `%${term}%`;

  try {
    const result = await pool.query(
      `SELECT id, nickname, name, surname, email, profile_picture
       FROM user_schema.users
       WHERE (LOWER(name) ILIKE LOWER($1)
          OR LOWER(surname) ILIKE LOWER($1)
          OR LOWER(nickname) ILIKE LOWER($1))
         AND id::text != $2`,
      [searchTerm, excludeId || '']
    );

    res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error('Error during smart search:', err);
    next(new CustomError('Failed to perform search', 500));
  }
});


/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update user profile information
 *     tags: [Users]
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
 *             properties:
 *               nickname:
 *                 type: string
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               email:
 *                 type: string
 *               profile_picture:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to update user
 */
userRouter.put('/:userId', authenticateFirebaseToken, async (req, res, next) => {
  const { userId } = req.params;
  const { nickname, name, surname, email, profile_picture } = req.body;

  try {
    const result = await pool.query(
      `UPDATE user_schema.users
       SET nickname = $1, name = $2, surname = $3, email = $4, profile_picture = $5
       WHERE id = $6
       RETURNING id, nickname, name, surname, email, profile_picture`,
      [nickname, name, surname, email, profile_picture, userId]
    );

    if (result.rows.length === 0) {
      return next(new CustomError('User not found', 404));
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user profile:', err);
    next(new CustomError('Failed to update user', 500));
  }
});

userRouter.get('/:userId', authenticateFirebaseToken, async (req, res, next) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, nickname, name, surname, email, profile_picture
       FROM user_schema.users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return next(new CustomError('User not found', 404));
    }

    res.status(200).json({ body: result.rows[0] });
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    next(new CustomError('Database query failed', 500));
  }
});

// POST /api/users/push-token
userRouter.post('/push-token', async (req, res, next) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ error: 'Missing email or token' });
  }

  try {
    const result = await pool.query(
      `UPDATE user_schema.users
       SET push_token = $1
       WHERE email = $2
       RETURNING id, email, push_token`,
      [token, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in SQL DB' });
    }

    res.status(200).json({ message: 'Push token saved', user: result.rows[0] });
  } catch (err) {
    console.error('❌ Error saving push token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default userRouter;
