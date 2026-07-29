import { ref, set, get, remove } from 'firebase/database';
import { auth, db } from '../config/firebase';

const STORAGE_KEY = 'cinedream_ratings';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function rateItem(tmdbId, rating) {
  const data = load();
  if (rating === null) {
    delete data[tmdbId];
  } else {
    data[tmdbId] = rating;
  }
  save(data);

  if (auth.currentUser) {
    if (rating === null) {
      remove(ref(db, `users/${auth.currentUser.uid}/ratings/${String(tmdbId)}`)).catch(() => {});
    } else {
      set(ref(db, `users/${auth.currentUser.uid}/ratings/${String(tmdbId)}`), rating).catch(() => {});
    }
  }
}

export function toggleRating(tmdbId, rating) {
  const current = getRating(tmdbId);
  if (current === rating) {
    rateItem(tmdbId, null);
    return null;
  }
  rateItem(tmdbId, rating);
  return rating;
}

export function getRating(tmdbId) {
  return load()[tmdbId] || null;
}

export function getAllRatings() {
  return load();
}

export async function loadCloudRatings() {
  if (!auth.currentUser) return null;
  try {
    const snap = await get(ref(db, `users/${auth.currentUser.uid}/ratings`));
    if (!snap.exists()) return null;
    return snap.val();
  } catch {
    return null;
  }
}
