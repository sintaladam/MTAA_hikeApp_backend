import express from 'express';
import authRoutes from './routes.js';

const PORT = process.env.PORT || 5423;
const app = express();
app.use(express.json());

app.use('/auth', authRoutes); // your signup endpoint is now at /auth/signup

app.get("/", (req, res) => {
  res.send('hello');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
