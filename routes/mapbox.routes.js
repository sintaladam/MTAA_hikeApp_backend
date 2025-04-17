import { Router } from "express";
import dotenv from 'dotenv';
import axios from 'axios';
import CustomError from '../middleware/customError.js';
import pool from '../utils/db.js';
import { authenticateToken } from '../middleware/auth.js';

dotenv.config();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

const mapboxRouter = Router();

/**
 * @swagger
 * /mapbox/search:
 *   get:
 *     summary: Search location using Mapbox Geocoding API
 *     tags: [Mapbox]
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Location text to search
 *     responses:
 *       200:
 *         description: Search results from Mapbox
 *       400:
 *         description: Query parameter is required
 *       500:
 *         description: Failed to fetch from Mapbox
 */
mapboxRouter.get('/search', async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return next(new CustomError('Query parameter is required', 400));
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Mapbox Error:', error.message);
    next(new CustomError('Failed to fetch from Mapbox', 500));
  }
});

/**
 * @swagger
 * /mapbox/waypoints:
 *   put:
 *     summary: Update, insert, or delete waypoints for a specific hike
 *     tags: [Mapbox]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hike_id:
 *                 type: integer
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [insert, update, delete]
 *                     id:
 *                       type: integer
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     order_number:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Waypoint operations completed
 *       400:
 *         description: Invalid request payload
 *       403:
 *         description: Unauthorized access to hike
 *       404:
 *         description: Hike not found
 *       500:
 *         description: Failed to process waypoint operations
 */
mapboxRouter.put('/waypoints', authenticateToken, async (req, res, next) => {
  const { hike_id, updates } = req.body;

  if (!hike_id || !Array.isArray(updates)) {
    return next(new CustomError('hike_id and updates array are required', 400));
  }

  try {
    const hikeExists = await pool.query(`SELECT * FROM hike_schema.hikes WHERE id = $1`, [hike_id]);
    if (hikeExists.rowCount === 0) {
      return next(new CustomError('Hike not found', 404));
    }

    const hike = hikeExists.rows[0];
    if (hike.user_id !== req.user.id) {
      return next(new CustomError('Unauthorized: not your hike', 403));
    }

    for (const item of updates) {
      const { type, id, latitude, longitude, order_number } = item;
      const created_at = new Date().toISOString();

      if (type === 'insert') {
        if (latitude == null || longitude == null || order_number == null) continue;

        await pool.query(
          `UPDATE hike_schema.hike_points SET order_number = order_number + 1 
           WHERE hike_id = $1 AND order_number >= $2`,
          [hike_id, order_number]
        );

        await pool.query(
          `INSERT INTO hike_schema.hike_points (hike_id, order_number, latitude, longitude, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [hike_id, order_number, latitude, longitude, created_at]
        );

      } else if (type === 'update') {
        if (!id || latitude == null || longitude == null || order_number == null) continue;

        const current = await pool.query(
          `SELECT order_number FROM hike_schema.hike_points WHERE id = $1 AND hike_id = $2`,
          [id, hike_id]
        );
        if (current.rowCount === 0) continue;

        const currentOrder = current.rows[0].order_number;

        if (order_number !== currentOrder) {
          if (order_number > currentOrder) {
            await pool.query(
              `UPDATE hike_schema.hike_points SET order_number = order_number - 1 
               WHERE hike_id = $1 AND order_number > $2 AND order_number <= $3`,
              [hike_id, currentOrder, order_number]
            );
          } else {
            await pool.query(
              `UPDATE hike_schema.hike_points SET order_number = order_number + 1 
               WHERE hike_id = $1 AND order_number >= $2 AND order_number < $3`,
              [hike_id, order_number, currentOrder]
            );
          }
        }

        await pool.query(
          `UPDATE hike_schema.hike_points
           SET latitude = $1, longitude = $2, order_number = $3
           WHERE id = $4 AND hike_id = $5`,
          [latitude, longitude, order_number, id, hike_id]
        );

      } else if (type === 'delete') {
        if (!id) continue;

        const deleted = await pool.query(
          `DELETE FROM hike_schema.hike_points WHERE id = $1 AND hike_id = $2 RETURNING order_number`,
          [id, hike_id]
        );
        
        if (deleted.rows.length === 0) {
          return next(new CustomError(`Waypoint with id ${id} not found`, 404));
        }
        
        const removedOrder = deleted.rows[0].order_number;
        
        await pool.query(
          `UPDATE hike_schema.hike_points SET order_number = order_number - 1
           WHERE hike_id = $1 AND order_number > $2`,
          [hike_id, removedOrder]
        );
        
      }
    }

    const waypoints = await pool.query(
      `SELECT * FROM hike_schema.hike_points WHERE hike_id = $1 ORDER BY order_number ASC`,
      [hike_id]
    );

    res.status(200).json({
      message: 'Waypoint operations completed',
      hike,
      waypoints: waypoints.rows
    });
  } catch (error) {
    console.error('DB Error:', error.message);
    next(new CustomError('Failed to process waypoint operations', 500));
  }
});

export default mapboxRouter;
