import admin from 'firebase-admin';
import 'dotenv/config';

const serviceAcc=JSON.parse(process.env.firebaseKey);
admin.initializeApp({
    credential: admin.credential.cert(serviceAcc)
  });

export default admin;