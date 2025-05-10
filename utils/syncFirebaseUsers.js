import { admin } from './firebase.js';
import pool from './db.js';

export async function syncFirebaseUsersOnce() {
  try {
    let insertedCount = 0;

    async function listAllUsers(nextPageToken) {
      const result = await admin.auth().listUsers(1000, nextPageToken);

      for (const user of result.users) {
        const { email, displayName, photoURL } = user;
        if (!email) continue;

        const exists = await pool.query(
          'SELECT id FROM user_schema.users WHERE email = $1',
          [email]
        );

        if (exists.rowCount === 0) {
          await pool.query(
            `INSERT INTO user_schema.users (email, name, profile_picture, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [email, displayName || 'Firebase User', photoURL || null]
          );
          insertedCount++;
        }
      }

      if (result.pageToken) {
        await listAllUsers(result.pageToken);
      }
    }

    await listAllUsers();
    console.log(`✅ Synced Firebase users → inserted ${insertedCount} new users.`);
  } catch (err) {
    console.error('❌ Firebase sync failed:', err);
  }
}
