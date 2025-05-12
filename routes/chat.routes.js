import express from 'express';
import { admin, db } from '../utils/firebase.js';
import { sendPushNotification } from '../utils/sendPush.js';
import pool from '../utils/db.js';

const router = express.Router();

router.get('/stream/:chatId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { chatId } = req.params;

  const ref = db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc');

  const unsubscribe = ref.onSnapshot(
    (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.write(`data: ${JSON.stringify(messages)}\n\n`);
    },
    (err) => {
      console.error('Firestore SSE snapshot error:', err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    }
  );

  req.on('close', () => {
    unsubscribe();
    res.end();
  });
});

router.post('/send', async (req, res) => {
  const { chatId, text, sender } = req.body;

  console.log('Received message:', { chatId, text, sender });

  if (!chatId || typeof chatId !== 'string') {
    return res.status(400).json({ error: 'Invalid chatId' });
  }

  try {
    // create and store the message
    const message = {
      text,
      sender,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('chats').doc(chatId).collection('messages').add(message);

    await db.collection('chats').doc(chatId).update({
      lastMessage: text,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 🔔 try to send a push notification
    const chatDoc = await db.collection('chats').doc(chatId).get();
    const users = chatDoc.data()?.users;

    if (!Array.isArray(users) || users.length !== 2) {
      console.warn('Invalid users array in chat doc');
      return res.status(200).json({ success: true });
    }

    const receiverUid = users.find(uid => uid !== sender);
    if (!receiverUid) {
      console.warn('Receiver UID not found');
      return res.status(200).json({ success: true });
    }

    const userSnapshot = await db.collection('users').doc(receiverUid).get();
    const receiverEmail = userSnapshot.data()?.email;

    if (!receiverEmail) {
      console.warn('Receiver email not found');
      return res.status(200).json({ success: true });
    }

    // lookup push token in Postgres
    const result = await pool.query(
      'SELECT push_token FROM user_schema.users WHERE email = $1',
      [receiverEmail]
    );

    const pushToken = result.rows[0]?.push_token;
    if (!pushToken) {
      console.warn(`No push token found for ${receiverEmail}`);
      return res.status(200).json({ success: true });
    }

    // send push
    await sendPushNotification(pushToken, 'New message', text);

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('Error sending message:', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});


router.get('/list/:firebaseUid', async (req, res) => {
  const { firebaseUid } = req.params;

  try {
    const snapshot = await db
      .collection('chats')
      .where('users', 'array-contains', firebaseUid)
      .orderBy('updatedAt', 'desc')
      .get();

    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(chats);
  } catch (e) {
    console.error('Failed to fetch chats:', e);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// GET Firebase UID by email
router.get('/firebase-uid', async (req, res) => {
  const { email } = req.query;

  try {
    const snapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const doc = snapshot.docs[0];
    return res.json({ uid: doc.id });
  } catch (e) {
    console.error('Error fetching Firebase UID:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST start new chat
router.post('/start-chat', async (req, res) => {
  const { currentUid, friendUid } = req.body;

  try {
    const existingChatSnap = await db
      .collection('chats')
      .where('users', 'array-contains', currentUid)
      .get();

    const existing = existingChatSnap.docs.find((doc) => {
      const users = doc.data().users;
      return Array.isArray(users) && users.includes(friendUid);
    });

    if (existing) {
      return res.json({ chatId: existing.id });
    }

    const newChat = await db.collection('chats').add({
      users: [currentUid, friendUid],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isGroup: false,
      lastMessage: '',
    });

    return res.json({ chatId: newChat.id });
  } catch (e) {
    console.error('Error starting chat:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
