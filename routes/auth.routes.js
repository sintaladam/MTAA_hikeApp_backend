import { Router } from "express";
import pool from '../utils/db.js';
import pkg from 'firebase-admin';
import serviceAccount from '../utils/firebase.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import CustomError from '../middleware/customError.js';
import bcrypt from 'bcrypt';

dotenv.config();
const admin = pkg;

const authRouter = Router();

// helper function to generate JWT
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               nickname:
 *                 type: string
 *               profile_picture:
 *                 type: string
 *               surname:
 *                 type: string
 *               birth_date:
 *                 type: string
 *               region:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       422:
 *         description: Invalid email format
 *       500:
 *         description: Error creating user
 */
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
    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }

    if (!email.includes('@') || !email.includes('.')) {
      throw new CustomError('Invalid email format', 422);
    }

    const userRecord = await admin.auth().createUser({ email, password });
    const created_at = new Date().toISOString();
    const hashedPasword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO user_schema.users (name, role, nickname, profile_picture, email, surname, created_at, birth_date, region, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, email, role',
      [name, role, nickname, profile_picture, email, surname, created_at, birth_date, region, hashedPasword]
    );

    const user = result.rows[0];

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid,
      token,
      refreshToken,
      user
    });

  } catch (error) {
    if (error instanceof CustomError) {
      return next(error);
    }

    console.error('Unexpected error:', error);
    next(new CustomError('Error creating user', 500));
  }
});

authRouter.post('/signin', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      throw new CustomError('Email and password required', 400);
    }

    const result = await pool.query(
      'SELECT * FROM user_schema.users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new CustomError('User not found', 404);
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new CustomError('Incorrect password', 401);
    }

    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: '30d'
    });

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err instanceof CustomError ? err : new CustomError('Signin failed', 500));
  }
});

authRouter.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token missing' });

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid refresh token' });

    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({ accessToken });
  });
});


export default authRouter;
