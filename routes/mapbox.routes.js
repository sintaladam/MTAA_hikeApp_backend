import { Router } from "express";
import dotenv from 'dotenv';
import axios from 'axios';
import CustomError from '../middleware/customError.js';
import pool from '../config/db.js';

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

// add a waypoint
mapboxRouter.post('/waypoints', async (req, res, next) => {
  const { hike_id, latitude, longitude } = req.body;

  if (!hike_id || !latitude || !longitude) {
    return next(new CustomError('hike_id, latitude and longitude are required', 400));
  }

  try {
    const created_at = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO hike_points (hike_id, latitude, longitude, created_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [hike_id, latitude, longitude, created_at]
    );

    res.status(201).json({ message: 'Waypoint added successfully', waypoint: result.rows[0] });
  } catch (error) {
    console.error('DB Error:', error.message);
    next(new CustomError('Failed to add waypoint', 500));
  }
});

export default mapboxRouter;
