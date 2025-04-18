import { admin } from '../utils/firebase.js';
import pool from '../utils/db.js';

export async function authenticateFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Look up user in your Postgres DB
    const result = await pool.query(
      'SELECT * FROM user_schema.users WHERE email = $1',
      [decodedToken.email]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'User not registered in database' });
    }

    req.user = {
      ...decodedToken,
      id: result.rows[0].id // your internal user id
    };

    next();
  } catch (error) {
    console.error('Firebase verification failed:', error);
    res.status(403).json({ error: 'Invalid Firebase token' });
  }
}
