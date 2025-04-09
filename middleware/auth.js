import jwt from 'jsonwebtoken';
import CustomError from '../utils/CustomError.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // expected format: "Bearer <token>"

  if (!token) {
    return next(new CustomError('Token missing', 401));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new CustomError('Token invalid or expired', 403));
    }

    req.user = user; // attach the user data to the request object
    next(); // continue to the next middleware or route
  });
}
