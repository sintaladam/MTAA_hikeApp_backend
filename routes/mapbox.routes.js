import { Router } from "express";
import dotenv from 'dotenv';
import axios from 'axios';
import CustomError from '../middleware/customError.js';

// This import is currently unused, so we might consider removing it later
// if we don’t end up storing any map data or queries in the DB.
// import pool from '../db.js';

dotenv.config();

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

const mapboxRouter = Router();

mapboxRouter.get('/search', async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    // Custom error handling to match the rest of the app
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

export default mapboxRouter;
