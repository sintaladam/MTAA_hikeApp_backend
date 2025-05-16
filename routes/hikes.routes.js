import { Router } from 'express';
import pool from '../utils/db.js';
import pkg from 'firebase-admin';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import CustomError from '../middleware/customError.js';
import { authenticateFirebaseToken } from '../middleware/firebaseAuth.js';
import polyline from '@mapbox/polyline';
import { Geometry } from 'wkx';

const hikeRouter = Router();

function polylineToWKT(polylineStr) {
  const coordinates = polyline.decode(polylineStr); // [[lat, lng], ...]
  const lngLatPairs = coordinates.map(([lat, lng]) => `${lng} ${lat}`);
  return `LINESTRING(${lngLatPairs.join(', ')})`;
}

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
hikeRouter.post('/add', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const { name, userEmail, start_point, dest_point, distance, calories, geom } = req.body;
    const created_at = new Date().toISOString();
    console.log(req.body);
    console.log(userEmail)

    const result = await pool.query(`
      SELECT u.id 
      FROM user_schema.users u 
      WHERE u.email = $1
      `,[userEmail]);
    const user_id = result.rows[0]?.id;
    if (!user_id) throw new Error("User not found");
    console.log(result.rows)
    // Decode polyline to WKT
    const geomWKT = polylineToWKT(geom); // → 'LINESTRING(...)'

    console.log("WKT:", geomWKT);
    // Insert hike with geometry
    const query_hikes = await pool.query(`
      INSERT INTO hike_schema.hikes (name, created_at, user_id, start_point, dest_point, distance, calories, geom)
      VALUES ($1, $2, $3, $4, $5, $6, $7, ST_GeomFromText($8, 4326))
      RETURNING id
    `, [name, created_at, user_id, start_point, dest_point, distance, calories, geomWKT]);

    const hikeId = query_hikes.rows[0].id;
    res.status(200).json({ hikeId, name, user_id });
  } catch (err) {
    console.error(err);
    next(new CustomError('Internal server error', 500));
  }
});

hikeRouter.delete('/delete', authenticateFirebaseToken, async (req, res, next) => {
  const { hike_id } = req.query;
  try {
    const hike = await pool.query(`SELECT * FROM hike_schema.hikes WHERE id = $1`, [hike_id]);
    if (hike.rowCount === 0) return res.status(404).json({ error: 'Hike not found' });
    if (hike.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query(`DELETE FROM hike_schema.hike_points WHERE hike_id = $1`, [hike_id]);
    await pool.query(`DELETE FROM hike_schema.hikes WHERE id = $1`, [hike_id]);

    res.status(200).json({ message: 'Hike deleted' });
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
hikeRouter.get('/from-user', authenticateFirebaseToken, async (req, res, next) => {
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

hikeRouter.put('/update', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const hikeId = req.query.hikeId;
    const {name,start_point,dest_point,distance,calories} = req.body;
    const query = await pool.query(`
        UPDATE hike_schema.hikes
        SET name = $1,
            start_point = $2,
            dest_point = $3,
            distance = $4,
            calories = $5,
            geom = geom
        WHERE id = $6;
    `, [name,start_point,dest_point,distance,calories,hikeId]);
    res.status(200).json({message: 'good',response: query.rows});
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
hikeRouter.get('/from-user-detail', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const hikeId = req.query.hikeId;

    const query = await pool.query(
      `SELECT *, ST_AsBinary(geom) AS geom_bin FROM hike_schema.hikes WHERE id = $1`,
      [hikeId]
    );

    if (query.rowCount === 0) {
      return next(new CustomError('Hike not found', 404));
    }

    const hike = query.rows[0];

    if (hike.user_id !== req.user.id) {
      return next(new CustomError('Unauthorized access to this hike', 403));
    }

    const geojson = Geometry.parse(hike.geom_bin).toGeoJSON();

    hike.geom = geojson;
    delete hike.geom_bin;

    res.status(200).json(hike);
  } catch (err) {
    console.error(err);
    next(new CustomError('Internal server error', 500));
  }
});

export default hikeRouter;
