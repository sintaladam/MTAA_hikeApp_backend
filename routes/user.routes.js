import { Router } from "express";
import pool from '../config/db.js';

const userRouter = Router();

userRouter.get('/',async (req,res) => {
    try {
        const result = await pool.query(`SELECT * FROM users`);
        res.status(200).json({title: "results:",body: result.rows});
    }catch (err) {
        console.error('DB query error:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});
userRouter.get('/search/:id?:email?', async (req,res) => {
    const { id, email } = req.query;

    if (!id && !email) {
        return res.status(400).json({ error: 'Either ID or email must be provided' });
    }
    let query = 'SELECT * FROM users WHERE ';
    let searchParam;

    if (id) {
        query += 'id = $1';
        searchParam = id; 
    } else if (email) {
        query += 'email ILIKE $1';
        searchParam = `%${email}%`;
    }

    try {
        const result = await pool.query(query, [searchParam]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ result: 'all good', body: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Database query failed' });
        console.log('Error message: ' + err);
    }
});

export default userRouter;