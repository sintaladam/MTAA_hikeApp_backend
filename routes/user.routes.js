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

export default userRouter;