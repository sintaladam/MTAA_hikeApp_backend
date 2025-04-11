import { Router } from "express";
import dotenv from 'dotenv';
import axios from 'axios';
import CustomError from '../middleware/customError.js';
import pool from '../db.js';
import pool from '../db.js';

//directions api https://api.mapbox.com/directions/v5/mapbox/walking/

dotenv.config();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

const mapboxRouter = Router();

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

mapboxRouter.put('/waypoints', async (req, res, next) => {
  const { hike_id, updates } = req.body;

  if (!hike_id || !Array.isArray(updates)) {
    return next(new CustomError('hike_id and updates array are required', 400));
  }

  try {
    const hikeExists = await pool.query(`SELECT 1 FROM hike_schema.hikes WHERE id = $1`, [hike_id]);
    if (hikeExists.rowCount === 0) {
      return next(new CustomError('Hike not found', 404));
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

        const current = await pool.query(`SELECT order_number FROM hike_schema.hike_points WHERE id = $1`, [id]);
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
           WHERE id = $4`,
          [latitude, longitude, order_number, id]
        );

      } else if (type === 'delete') {
        if (!id) continue;

        const deleted = await pool.query(
          `DELETE FROM hike_schema.hike_points WHERE id = $1 RETURNING order_number`,
          [id]
        );

        if (deleted.rows.length > 0) {
          const removedOrder = deleted.rows[0].order_number;

          await pool.query(
            `UPDATE hike_schema.hike_points SET order_number = order_number - 1
             WHERE hike_id = $1 AND order_number > $2`,
            [hike_id, removedOrder]
          );
        }
      }
    }

    const hike = await pool.query(`SELECT * FROM hike_schema.hikes WHERE id = $1`, [hike_id]);
    const waypoints = await pool.query(
      `SELECT * FROM hike_schema.hike_points WHERE hike_id = $1 ORDER BY order_number ASC`,
      [hike_id]
    );

    res.status(200).json({
      message: 'Waypoint operations completed',
      hike: hike.rows[0],
      waypoints: waypoints.rows
    });
  } catch (error) {
    console.error('DB Error:', error.message);
    next(new CustomError('Failed to process waypoint operations', 500));
  }
});


mapboxRouter.get('/testing', async (req, res, next) => {
  try {
    const coordinates = req.body.coord1 + ';'+ req.body.coord2;
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;
    
    const response = await axios.get(url);
    res.json(response.data);
    
  } catch (error) {
    console.error('Mapbox Error:', error);
    next(new CustomError('Failed to fetch from Mapbox', 500));
  }
});

export default mapboxRouter;
