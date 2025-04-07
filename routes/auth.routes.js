import { Router } from "express";
import pool from '../config/db.js';
import pkg from 'firebase-admin';
import serviceAccount from '../firebase.js'
const admin = pkg;


const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
    const { name, email, password, role, nickname, profile_picture, surname, birth_date, region} = req.body;
  
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });
      const created_at = new Date().toISOString();

      const result = await pool.query(
        'INSERT INTO users (name, role, nickname, profile_picture, email, surname, created_at, birth_date, region) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [name, role, nickname, profile_picture, email, surname, created_at, birth_date, region]
        );
      res.status(201).json({
        message: 'User created successfully',
        uid: userRecord.uid,
        email: userRecord.email,
        body: result.rows
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(400).json({ error: error.message });
    }
  });

export default authRouter;