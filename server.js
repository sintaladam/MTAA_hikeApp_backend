import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';

import path from 'path';
import express from 'express';
import http from 'http'; // ✅ added
import { WebSocketServer } from 'ws'; // ✅ added

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
import chatRouter from './routes/chat.routes.js';
import { db } from './utils/firebase.js'; // ✅ required for Firestore access

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
app.use('/api/chat', chatRouter);

app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

app.use('/uploads', express.static(path.resolve('./uploads')));
app.use(errorHandler);

// ✅ Replace app.listen() with HTTP + WS setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const chatSubscriptions = new Map(); // Map<chatId, Set<WebSocket>>

wss.on('connection', (ws, req) => {
  console.log('🧪 Incoming WS req.url:', req.url);
  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log('🧪 Full parsed pathname:', url.pathname);
  const parts = url.pathname.split('/');
  const chatId = parts.filter(Boolean).pop();
  console.log('🧪 path parts:', parts);
  console.log('🧪 chatId:', chatId);

  if (!chatId) {
    console.error('❌ No chatId found in WebSocket URL');
    ws.close();
    return;
  }

  console.log(`🔌 WebSocket connected for chat ${chatId}`);

  if (!chatSubscriptions.has(chatId)) {
    chatSubscriptions.set(chatId, new Set());
  }
  chatSubscriptions.get(chatId).add(ws);

  // attach Firestore listener once per chatId
  if (chatSubscriptions.get(chatId).size === 1) {
    const ref = db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc');

    const unsubscribe = ref.onSnapshot((snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      chatSubscriptions.get(chatId)?.forEach(client => {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify(messages));
        }
      });
    });

    ws.on('close', () => {
      chatSubscriptions.get(chatId).delete(ws);
      if (chatSubscriptions.get(chatId).size === 0) {
        unsubscribe();
        chatSubscriptions.delete(chatId);
      }
    });
  } else {
    ws.on('close', () => {
      chatSubscriptions.get(chatId).delete(ws);
    });
  }
});


// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 Server with WebSocket running on http://localhost:${PORT}`);
  syncFirebaseUsersOnce();
  swaggerDocs(app, PORT);
});
