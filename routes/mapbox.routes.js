import { Router } from "express";
import dotenv from 'dotenv';
import axios from 'axios';
import CustomError from '../middleware/customError.js';
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


mapboxRouter.get('/testing', async (req, res, next) => {
  try {
    // Properly format coordinates for Mapbox Directions API
    const coordinates = req.body.coord1 + ';'+ req.body.coord2;
    
    // Create the URL with proper format
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;
    
    // Make the actual API call
    const response = await axios.get(url);
    res.json(response.data);
    
    // For debugging only, uncomment to see the URL
    // res.json({url});
  } catch (error) {
    console.error('Mapbox Error:', error);
    next(new CustomError('Failed to fetch from Mapbox', 500));
  }
});

// update an existing hikes waypoints
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

    const results = [];
    const created_at = new Date().toISOString();

    for (const item of updates) {
      const { type, id, latitude, longitude, order_number } = item;

      if (!type) continue;

      if (type === 'insert') {
        if (latitude == null || longitude == null || order_number == null) continue;

        const insert = await pool.query(
          `INSERT INTO hike_points (hike_id, order_number, latitude, longitude, created_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [hike_id, order_number, latitude, longitude, created_at]
        );
        results.push({ type: 'insert', data: insert.rows[0] });

      } else if (type === 'update') {
        if (!id || latitude == null || longitude == null) continue;

        const update = await pool.query(
          `UPDATE hike_points SET latitude = $1, longitude = $2 WHERE id = $3 RETURNING *`,
          [latitude, longitude, id]
        );
        results.push({ type: 'update', data: update.rows[0] });

      } else if (type === 'delete') {
        if (!id) continue;

        const del = await pool.query(
          `DELETE FROM hike_points WHERE id = $1 RETURNING *`,
          [id]
        );
        results.push({ type: 'delete', data: del.rows[0] });
      }
    }

    res.status(200).json({ message: 'Waypoint operations completed', results });

  } catch (error) {
    console.error('DB Error:', error.message);
    next(new CustomError('Failed to update waypoints', 500));
  }
});

export default mapboxRouter;
