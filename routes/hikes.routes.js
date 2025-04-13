import { Router } from 'express';
import pool from '../utils/db.js';
import pkg from 'firebase-admin';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import CustomError from '../middleware/customError.js';

const hikeRouter = Router();

hikeRouter.post('/add',async (req,res,next) => {
    try {
        const {name, user_id} = req.body;
        const array = req.body.points;

        const created_at = new Date().toISOString();    

        const query_hikes = await pool.query(`INSERT INTO hike_schema.hikes (name,created_at,user_id) VALUES ($1,$2,$3) RETURNING id`,
        [name,created_at,user_id]);
        const id_from_hikes = query_hikes.rows[0].id;

        for (let i = 0; i < array.length; i++){
            const query_hike_points = await pool.query(`
            INSERT INTO hike_schema.hike_points 
            (hike_id,order_number,latitude,longitude,created_at)
            VALUES ($1,$2,$3,$4,$5)
            `,[id_from_hikes,i,array[i].latitude,array[i].longitude,created_at]);
        }        
        console.log(name,user_id,created_at,array);
        res.status(200).json({"response": name,user_id})
    } catch (err) {
        console.error(err);
        next(new CustomError('Internal server error', 500));    
    }
})

hikeRouter.get('/test',async (req,res) => {
    const array = req.body.points;
    
    // Optional: confirm receipt
    res.status(200).json({ message: 'Received points!', count: array.length });
    
    // Log each point
    for (let i = 0; i < array.length; i++) {
        console.log(`Point ${i}:`, array[i].latitude, array[i].longitude);
    }
})

hikeRouter.get('/from-user', async (req,res) => {
    try {
        const userId = req.query.id;

        let query = await pool.query(`
        SELECT hike.id,hike.name,hike.created_at,hike.user_id,creator.nickname 
        FROM hike_schema.hikes hike 
        JOIN user_schema.users creator 
        ON hike.user_id = creator.id
        WHERE user_id = $1
        `,[userId]);
        res.status(200).json(query.rows);

    } catch (err) {
        console.error(err);
        next(new CustomError('Internal server error', 500));    
    }
})


hikeRouter.get('/from-user-detail', async (req,res) => {
    try {
        const {userId, hikeId} = req.query;

        let query = await pool.query(`
        SELECT hike.*,creator.nickname 
        FROM hike_schema.hikes hike 
        JOIN user_schema.users creator 
        ON hike.user_id = creator.id
        WHERE user_id = $1
        AND hike.id = $2;
        `, [userId, hikeId]);
        console.log(userId,hikeId);
        res.status(200).json(query.rows); 

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' }); 
    }
})

// hikeRouter.update('/from-user-edit', async (req,res) => {
//     userId = req.query.id;
//     let query = await pool.query(``);


// })


export default hikeRouter;