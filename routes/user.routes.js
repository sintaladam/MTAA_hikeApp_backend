import { Router } from "express";
import pool from '../db.js';
import CustomError from '../middleware/customError.js';
import jwt from 'jsonwebtoken';

const userRouter = Router();

userRouter.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM users`);
    res.status(200).json({ title: "results:", body: result.rows });
  } catch (err) {
    console.error('DB query error:', err);
    next(new CustomError('Database query failed', 500));
  }
});

userRouter.get('/search', async (req, res, next) => {
  const { id, email } = req.query;

  if (!id && !email) {
    return next(new CustomError('Either ID or email must be provided', 400));
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
      return next(new CustomError('User not found', 404));
    }
    res.status(200).json({ result: 'all good', body: result.rows });
  } catch (err) {
    console.error('Error message: ' + err);
    next(new CustomError('Database query failed', 500));
  }
});

export default userRouter;
