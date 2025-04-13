import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(
  await readFile(new URL('./service_account/hikeapp-mtaa-firebase-adminsdk-fbsvc-9d34643673.json', import.meta.url), 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default serviceAccount;