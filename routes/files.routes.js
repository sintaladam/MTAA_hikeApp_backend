import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import CustomError from '../middleware/customError.js';

const fileRouter = Router();

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

fileRouter.post('/profile-picture', upload.single('file'), (req, res, next) => {
  if (!req.file) return next(new CustomError('No file uploaded', 400));

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(200).json({
    message: 'Profile picture uploaded',
    url: fileUrl
  });
});

export default fileRouter;
