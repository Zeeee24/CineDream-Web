import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
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

export async function handleGoogleSignIn(authObj, provider) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    await signInWithRedirect(authObj, provider);
    return null;
  }
  const result = await signInWithPopup(authObj, provider);
  return result.user;
}

export { getRedirectResult };
