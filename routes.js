import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid,
      email: userRecord.email,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
