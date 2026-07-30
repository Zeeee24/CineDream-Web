import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ERROR_MESSAGES = {
  'auth/operation-not-allowed': 'Google sign-in is not enabled. Please use email sign-in, or enable Google in the Firebase Console.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method. Try signing in with email instead.',
  'auth/popup-blocked': 'Popup was blocked by your browser. Please allow popups for this site, or try signing in with email.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
  'auth/popup-blocked-by-user': 'Sign-in popup was closed before completing.',
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/popup-sign-in-cancelled': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in. Please try using email sign-in instead.',
  'auth/redirect-cancelled-by-user': 'Sign-in was cancelled.',
  'auth/redirect-operation-pending': 'A sign-in redirect is already in progress. Please wait...',
  'auth/missing-android-pkg-name': 'An Android package name is required for this sign-in method.',
  'auth/missing-iframe-continue': 'Unable to complete sign-in. Please try again.',
  'auth/web-storage-unsupported': 'Your browser does not support the required storage. Please try a different browser.',
  'auth/requires-recent-login': 'For security, please sign in again before continuing.',
};

function formatError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const code = error.code || '';
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (error.message?.includes('redirect')) {
    return 'Sign-in redirect encountered an issue. Please try again or use email sign-in.';
  }
  const clean = code.replace('auth/', '').replace(/-/g, ' ');
  return 'Sign-in failed: ' + clean.charAt(0).toUpperCase() + clean.slice(1);
}

export default function AuthModal({ isOpen, onClose }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, redirectPending } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const overlayRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (isOpen && emailRef.current) {
      emailRef.current.focus();
    }
  }, [isOpen, isSignUp]);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleGoogleSignIn() {
    setError('');
    setSubmitting(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="auth-modal">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="auth-modal-title">{isSignUp ? 'Create Account' : 'Sign In'}</h2>

        <button className="auth-btn-google" onClick={handleGoogleSignIn} disabled={submitting || redirectPending}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {redirectPending ? 'Redirecting to Google...' : submitting ? 'Please wait...' : 'Continue with Google'}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form className="auth-form" onSubmit={handleEmailSubmit}>
          {isSignUp && (
            <input
              className="auth-input"
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input
            ref={emailRef}
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-btn-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
