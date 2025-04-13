import { Router } from 'express';
import pool from '../utils/db.js';
import pkg from 'firebase-admin';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import CustomError from '../middleware/customError.js';
import { authenticateToken } from '../middleware/auth.js';

const hikeRouter = Router();

/**
 * @swagger
 * /hikes/add:
 *   post:
 *     summary: Create a new hike with points
 *     tags: [Hikes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               points:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *     responses:
 *       200:
 *         description: Hike created
 *       500:
 *         description: Internal server error
 */
hikeRouter.post('/add', authenticateToken, async (req, res, next) => {
  try {
    const { name, points } = req.body;
    const user_id = req.user.id;
    const created_at = new Date().toISOString();    

    const query_hikes = await pool.query(`
        INSERT INTO hike_schema.hikes (name, created_at, user_id)
        VALUES ($1, $2, $3)
        RETURNING id
    `, [name, created_at, user_id]);

    const id_from_hikes = query_hikes.rows[0].id;

    for (let i = 0; i < points.length; i++) {
      await pool.query(`
          INSERT INTO hike_schema.hike_points 
          (hike_id, order_number, latitude, longitude, created_at)
          VALUES ($1, $2, $3, $4, $5)
      `, [id_from_hikes, i, points[i].latitude, points[i].longitude, created_at]);
    }

    res.status(200).json({ response: name, user_id });
  } catch (err) {
    console.error(err);
    next(new CustomError('Internal server error', 500));    
  }
});

/**
 * @swagger
 * /hikes/from-user:
 *   get:
 *     summary: Get all hikes created by the authenticated user
 *     tags: [Hikes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's hikes
 *       500:
 *         description: Internal server error
 */
hikeRouter.get('/from-user', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const query = await pool.query(`
        SELECT hike.id, hike.name, hike.created_at, hike.user_id, creator.nickname 
        FROM hike_schema.hikes hike 
        JOIN user_schema.users creator 
        ON hike.user_id = creator.id
        WHERE user_id = $1
    `, [userId]);

    res.status(200).json(query.rows);
  } catch (err) {
    console.error(err);
    next(new CustomError('Internal server error', 500));    
  }
});

/**
 * @swagger
 * /hikes/from-user-detail:
 *   get:
 *     summary: Get detailed info about one specific hike belonging to the authenticated user
 *     tags: [Hikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: hikeId
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed hike object
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Hike not found
 *       500:
 *         description: Internal server error
 */
hikeRouter.get('/from-user-detail', authenticateToken, async (req, res, next) => {
  try {
    const hikeId = req.query.hikeId;

    const query = await pool.query(
      `SELECT * FROM hike_schema.hikes WHERE id = $1`,
      [hikeId]
    );

    if (query.rowCount === 0) {
      return next(new CustomError('Hike not found', 404));
    }

    const hike = query.rows[0];

    if (hike.user_id !== req.user.id) {
      return next(new CustomError('Unauthorized access to this hike', 403));
    }

    res.status(200).json(hike);
  } catch (err) {
    console.error(err);
    next(new CustomError('Internal server error', 500));
  }
});

export default hikeRouter;
