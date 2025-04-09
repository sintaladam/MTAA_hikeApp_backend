import { Router } from "express";
import pool from '../config/db.js';
import pkg from 'firebase-admin';
import serviceAccount from '../firebase.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import CustomError from '../middleware/customError.js';

dotenv.config();
const admin = pkg;

const authRouter = Router();

// helper function to generate JWT
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

authRouter.post('/signup', async (req, res, next) => {
  const {
    name,
    email,
    password,
    role,
    nickname,
    profile_picture,
    surname,
    birth_date,
    region
  } = req.body;

  try {
    // basic validation example
    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }

    // basic email format check thing i tried
    if (!email.includes('@') || !email.includes('.')) {
      throw new CustomError('Invalid email format', 422);
    }

    const userRecord = await admin.auth().createUser({ email, password });
    const created_at = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO users (name, role, nickname, profile_picture, email, surname, created_at, birth_date, region) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, role',
      [name, role, nickname, profile_picture, email, surname, created_at, birth_date, region]
    );

    const user = result.rows[0];

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid,
      token,
      user
    });

  } catch (error) {
    // if it's already a custom error, just forward it
    if (error instanceof CustomError) {
      return next(error);
    }

    console.error('Unexpected error:', error);
    next(new CustomError('Error creating user', 500));
  }
});

export default authRouter;
