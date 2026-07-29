import { ref, set, get, remove } from 'firebase/database';
import { auth, db } from '../config/firebase';

const STORAGE_KEY = 'cinedream_mylist';
const MAX_ITEMS = 200;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addToWatchlist(item) {
  const entry = {
    tmdbId: item.tmdbId,
    title: item.title,
    posterPath: item.posterPath || null,
    backdropPath: item.backdropPath || null,
    mediaType: item.mediaType || 'movie',
    addedDate: new Date().toISOString(),
  };

  const items = load().filter((h) => h.tmdbId !== item.tmdbId);
  items.unshift(entry);
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  save(items);

  if (auth.currentUser) {
    set(ref(db, `users/${auth.currentUser.uid}/watchlist/${String(item.tmdbId)}`), entry).catch(() => {});
  }
}

export function removeFromWatchlist(tmdbId) {
  save(load().filter((h) => h.tmdbId !== tmdbId));
  if (auth.currentUser) {
    remove(ref(db, `users/${auth.currentUser.uid}/watchlist/${String(tmdbId)}`)).catch(() => {});
  }
}

export function toggleWatchlist(item) {
  if (isInWatchlist(item.tmdbId)) {
    removeFromWatchlist(item.tmdbId);
    return false;
  }
  addToWatchlist(item);
  return true;
}

export function isInWatchlist(tmdbId) {
  return load().some((h) => h.tmdbId === tmdbId);
}

export function getWatchlist() {
  return load();
}

export async function loadCloudWatchlist() {
  if (!auth.currentUser) return null;
  try {
    const snap = await get(ref(db, `users/${auth.currentUser.uid}/watchlist`));
    if (!snap.exists()) return null;
    const data = snap.val();
    return Object.values(data).sort(
      (a, b) => new Date(b.addedDate) - new Date(a.addedDate)
    );
  } catch {
    return null;
  }
}
