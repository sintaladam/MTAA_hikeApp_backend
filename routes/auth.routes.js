import { Router } from "express";
import pool from '../utils/db.js';
// import pkg from 'firebase-admin';
import { admin } from '../utils/firebase.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import CustomError from '../middleware/customError.js';
import bcrypt from 'bcrypt';

dotenv.config();
// const admin = pkg;

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
    role,
    nickname,
    profile_picture,
    surname,
    birth_date,
    region
  } = req.body;
  const authHeader = req.headers.authorization;
  const idToken = authHeader.split(' ')[1]; // Extract the token
  console.log(idToken);
  console.log(email)
  try {
    if (!email || !idToken) {
      throw new CustomError('Email and ID token are required', 400);
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(decodedToken.email);
    if (decodedToken.email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
      throw new CustomError('Email does not match token', 403);
    }

    // Check if user already exists in your DB (optional)
    const existingUser = await pool.query(
      'SELECT id FROM user_schema.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(200).json({
        message: 'User already exists in the local database',
        user: existingUser.rows[0]
      });
    }

    const created_at = new Date().toISOString();

    const result = await pool.query(
      'INSERT INTO user_schema.users (name, role, nickname, profile_picture, email, surname, created_at, birth_date, region) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, role',
      [name, role, nickname, profile_picture, email, surname, created_at, birth_date, region]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'User created in local DB successfully',
      uid: decodedToken.uid,
      token: decodedToken,
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

authRouter.post('/custom-token', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new CustomError('Missing or invalid Authorization header', 401);
    }

    const idToken = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Optional: You can log or restrict access here based on claims or role
    console.log('Generating custom token for UID:', decoded.uid);

    const customToken = await admin.auth().createCustomToken(decoded.uid);

    res.status(200).json({ customToken });
  } catch (err) {
    console.error('Error creating custom token:', err);
    next(new CustomError('Failed to create custom token', 500));
  }
});


export default authRouter;
