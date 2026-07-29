import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, googleProvider, db } from '../config/firebase';
import { syncLocalStorageToCloud } from '../services/cloudSync';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
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

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
