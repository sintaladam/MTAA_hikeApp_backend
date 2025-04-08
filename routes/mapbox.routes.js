import { Router } from "express";
import pool from '../db.js';
import dotenv from 'dotenv';

import axios from 'axios';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

const mapboxRouter = Router();

mapboxRouter.get('/search',async (req,res) => {
    const { query } = req.query;

    if (!query) return res.status(400).json({ error: 'Query parameter is required' });

    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}`;

        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Mapbox Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Mapbox' });
    }
})

export default mapboxRouter;