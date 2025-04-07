import express from 'express';
import authRoutes from './routes.js';
import client from './db.js';

const PORT = process.env.PORT || 5423;
const app = express();
app.use(express.json());

app.use('/auth', authRoutes); // your signup endpoint is now at /auth/signup

app.get("/", (req, res) => {
  res.send('hello');
});
app.post('/user/register', async (req, res) => {
    const {
        name,
        role,
        nickname,
        profile_picture,
        email,
        surname,
        password_hash,
        created_at,
        birth_date,
        region
    } = req.body;

    if (!name || !email || !password_hash) {
        return res.status(400).json({ error: 'Missing required fields (name, email, password_hash)' });
    }

    try {
        const result = await client.query(
            'INSERT INTO users (name, role, nickname, profile_picture, email, surname, password_hash, created_at, birth_date, region) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [name, role, nickname, profile_picture, email, surname, password_hash, created_at, birth_date, region]
        );

        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        console.error('Error inserting user:', err);
        res.status(500).json({ error: 'Database insert error' });
    }
});
app.post('/user/register', async (req, res) => {
    const {
        name,
        role,
        nickname,
        profile_picture,
        email,
        surname,
        password_hash,
        created_at,
        birth_date,
        region
    } = req.body;

    if (!name || !email || !password_hash) {
        return res.status(400).json({ error: 'Missing required fields (name, email, password_hash)' });
    }

    try {
        const result = await client.query(
            'INSERT INTO users (name, role, nickname, profile_picture, email, surname, password_hash, created_at, birth_date, region) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [name, role, nickname, profile_picture, email, surname, password_hash, created_at, birth_date, region]
        );

        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        console.error('Error inserting user:', err);
        res.status(500).json({ error: 'Database insert error' });
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
