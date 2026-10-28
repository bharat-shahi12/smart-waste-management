import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBNwUIYtUXU1RMZRL8NnFeU3_XcGckiFKo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'smart-waste-management-e1235.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://smart-waste-management-e1235-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'smart-waste-management-e1235',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'smart-waste-management-e1235.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '57067164282',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:57067164282:web:7d2b1451020449a86c21c3',
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const database: Database = getDatabase(app);
export const realtimeDatabase: Database = database;
export const isFirebaseConfigured = true;

export default database;
