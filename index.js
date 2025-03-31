import express from 'express';
import client from './db.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import admin from './firebase.js';

const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());

// // **sign up api**
// app.post('/users', async (req, res) => {
//   try {
//     const {role, nickname, name, surname, email, password, birth_date, region, profile_picture} = req.body;
    
//     var salt = bcrypt.genSaltSync(10);
//     var password_hash = bcrypt.hashSync(password, salt);

//     const query = `
//       INSERT INTO users (role, nickname, name, surname, email, password_hash, birth_date, region, profile_picture)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
//     `;
    
//     const values = [role, nickname, name, surname, email, password_hash, birth_date, region, profile_picture];

//     const result = await client.query(query, values);

//     res.status(201).json(result.rows[0]); // Return inserted user
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
// // **sign in api**
// // **Sign-in API**
// app.post('/users/login', async (req, res) => {
//     try {
//         const { nickname, password } = req.body; // Get nickname and password from request body
        
//         if (!nickname || !password) {
//             return res.status(400).json({ error: 'Nickname and password are required' });
//         }

//         // Query the database to check if the user exists
//         const query = `
//             SELECT * FROM users WHERE nickname = $1;
//         `;
//         const values = [nickname];

//         const result = await client.query(query, values);

//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         const user = result.rows[0];
        
//         // Compare the provided password with the stored hashed password
//         const isMatch = await bcrypt.compare(password, user.password_hash);

//         if (!isMatch) {
//             return res.status(401).json({ error: 'Invalid credentials' });
//         }

//         // If the password matches, return the user details (excluding sensitive data)
//         const { password_hash, ...userWithoutPassword } = user;
//         res.status(200).json(userWithoutPassword);

//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });


const app = express();
app.use(express.json());

app.post('/auth', async (req, res) => {
    try {
        const { idToken } = req.body; // Firebase ID token from frontend

        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email, name } = decodedToken;

        // Check if user exists in PostgreSQL
        const query = `SELECT * FROM users WHERE firebase_uid = $1`;
        const result = await client.query(query, [uid]);

        if (result.rows.length === 0) {
            // If user doesn't exist, create a new one in PostgreSQL
            const insertQuery = `
                INSERT INTO users (firebase_uid, email, name) VALUES ($1, $2, $3) RETURNING *;
            `;
            const newUser = await client.query(insertQuery, [uid, email, name]);
            return res.status(201).json(newUser.rows[0]);
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Unauthorized' });
    }
});



// **Start Server**
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
