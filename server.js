import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';

import path from 'path';
import express from 'express';
import pool from './utils/db.js';
import userRouter from './routes/user.routes.js';
import authRouter from './routes/auth.routes.js';
import mapboxRouter from './routes/mapbox.routes.js';
import hikeRouter from './routes/hikes.routes.js';
import errorHandler from './middleware/errorHandler.js';
import settingsRouter from './routes/settings.routes.js';
import friendRouter from './routes/friends.routes.js';
import fileRouter from './routes/files.routes.js';
import { syncFirebaseUsersOnce } from './utils/syncFirebaseUsers.js';
import swaggerDocs from './utils/swagger.js';

const PORT = process.env.SERVER_PORT;
const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/mapbox', mapboxRouter);
app.use('/api/hikes', hikeRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/friends', friendRouter);
app.use('/api/files', fileRouter);

app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

app.use('/uploads', express.static(path.resolve('./uploads')));

app.use(errorHandler);

swaggerDocs(app,PORT);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  syncFirebaseUsersOnce();
});