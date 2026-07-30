import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, googleProvider, db, handleGoogleSignIn, getRedirectResult } from '../config/firebase';
import { syncLocalStorageToCloud } from '../services/cloudSync';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectPending, setRedirectPending] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setRedirectPending(false);
        const profileRef = ref(db, `users/${firebaseUser.uid}/profile`);
        const snap = await get(profileRef);
        if (snap.exists()) {
          setUserProfile(snap.val());
        } else {
          const profile = {
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            email: firebaseUser.email || '',
            uid: firebaseUser.uid,
          };
          await set(profileRef, profile);
          setUserProfile(profile);
        }
        await syncLocalStorageToCloud(firebaseUser.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          setRedirectPending(false);
        }
      })
      .catch((err) => {
        setRedirectPending(false);
        const code = err?.code || '';
        if (code === 'auth/unauthorized-domain') {
          console.warn('Redirect auth: Domain not authorized. Add this domain to Firebase Console → Authentication → Settings → Authorized domains.');
        } else if (code === 'auth/operation-not-allowed') {
          console.warn('Redirect auth: Google sign-in is not enabled in Firebase Console.');
        } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          console.warn('Redirect result error:', err);
        }
      });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      setRedirectPending(true);
      try {
        await handleGoogleSignIn(auth, googleProvider);
      } catch (err) {
        setRedirectPending(false);
        throw err;
      }
    } else {
      const resultUser = await handleGoogleSignIn(auth, googleProvider);
      return resultUser;
    }
  }, []);

  async function signInWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  async function signUpWithEmail(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    const profile = {
      displayName: displayName || '',
      photoURL: '',
      email: result.user.email,
      uid: result.user.uid,
    };
    await set(ref(db, `users/${result.user.uid}/profile`), profile);
    setUserProfile(profile);
    return result.user;
  }

  async function logOut() {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  }

  const isLoggedIn = !!user;

  const value = {
    user,
    userProfile,
    loading,
    isLoggedIn,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logOut,
    redirectPending,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
