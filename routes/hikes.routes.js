import { Router } from 'express';
import pool from '../db.js';
import pkg from 'firebase-admin';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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
        res.status(500).json({ error: 'Internal server error' });    
    }
})

hikeRouter.get('/from-user', async (req,res) => {
    try {
        const userId = req.query.id;

        let query = await pool.query(`
        SELECT hike.name,hike.created_at,hike.user_id,creator.nickname 
        FROM hike_schema.hikes hike 
        JOIN user_schema.users creator 
        ON hike.user_id = creator.id
        WHERE user_id = $1
        `,[userId]);
        res.status(200).json(query.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' }); 
    }
})


hikeRouter.get('/from-user-detail', async (req,res) => {
    try {
        const userId = req.query.id;

        let query = await pool.query(`
        SELECT hike.*,creator.nickname 
        FROM hike_schema.hikes hike 
        JOIN user_schema.users creator 
        ON hike.user_id = creator.id
        WHERE user_id = $1
        `, [userId]);

        res.status(200).json(query.rows); 

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' }); 
    }
})


export default hikeRouter;