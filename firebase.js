import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(
  await readFile(new URL('./api_key/mtaa-hikeapp-firebase-adminsdk-fbsvc-2f9415a33d.json', import.meta.url), 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default serviceAccount;