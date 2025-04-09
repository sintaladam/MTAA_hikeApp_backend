import { Router } from 'express';
import pool from '../db.js';
import pkg from 'firebase-admin';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import CustomError from '../utils/CustomError.js';

const hikeRouter = Router();

hikeRouter.post('/add',async (req,res) => {
    try {
        const {name, user_id} = req.body;
        const created_at = new Date().toISOString();    

        const query = await pool.query(`INSERT INTO hike_schema.hikes (name,created_at,user_id) VALUES ($1,$2,$3)`,
        [name,created_at,user_id]);

        console.log(name,user_id,created_at)
        res.status(200).json({"response": name,user_id})
    } catch (err) {
        console.error(err);
        next(new CustomError('Internal server error', 500));    
    }
})

hikeRouter.get('/from-user', async (req,res) => {
    try {
        const userId = req.query.id;

        let query = await pool.query(`SELECT * FROM hike_schema.hikes WHERE user_id = $1`, [userId]);

        res.status(200).json(query.rows); // sends the data back as JSON

    } catch (err) {
        console.error(err);
        next(new CustomError('Internal server error', 500));    
    }
})

export default hikeRouter;