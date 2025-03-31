import admin from 'firebase-admin';
import serviceAccount from './mtaa-hikeapp-firebase-adminsdk-fbsvc-44f88938e5.json' with {type: "json"}; //found in firebase control

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
