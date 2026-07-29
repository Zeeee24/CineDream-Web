import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDctiq1DL8RToB9NWqicsJtph4-dWbv9vM',
  authDomain: 'cinedream-8b316.firebaseapp.com',
  databaseURL: 'https://cinedream-8b316-default-rtdb.firebaseio.com',
  projectId: 'cinedream-8b316',
  storageBucket: 'cinedream-8b316.firebasestorage.app',
  messagingSenderId: '297915207603',
  appId: '1:297915207603:web:c4b4e1db09fd9d09f3c5a0',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);
