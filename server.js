import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import pool from './db.js';
import userRouter from './routes/user.routes.js';
import authRouter from './routes/auth.routes.js';
import mapboxRouter from './routes/mapbox.routes.js';
import hikeRouter from './routes/hikes.routes.js';
import errorHandler from './middleware/errorHandler.js';
import settingsRouter from './routes/settings.routes.js';

const PORT = process.env.SERVER_PORT;
const app = express();

app.use(express.json());

app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/mapbox', mapboxRouter);
app.use('/api/hikes', hikeRouter);
app.use('/api/settings', settingsRouter);

app.use('/',async (req,res) => res.status(200).send('Welcome to our HikeApi'));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});