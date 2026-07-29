import { ref, set, get, remove } from 'firebase/database';
import { auth, db } from '../config/firebase';

const STORAGE_KEY = 'cinedream_history';
const MAX_ITEMS = 50;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function cloudWrite(path, data) {
  if (!auth.currentUser) return;
  set(ref(db, `users/${auth.currentUser.uid}/${path}`), data).catch(() => {});
}

function buildHistoryObject(items) {
  const obj = {};
  for (const item of items) {
    obj[String(item.tmdbId)] = item;
  }
  return obj;
}

export function addToHistory(item) {
  const entry = {
    tmdbId: item.tmdbId,
    title: item.title,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath || null,
    contentType: item.contentType,
    season: item.season || null,
    episode: item.episode || null,
    progressSeconds: item.progressSeconds || 0,
    durationSeconds: item.durationSeconds || 0,
    watchedDate: new Date().toISOString(),
  };

  const items = loadHistory().filter((h) => h.tmdbId !== item.tmdbId);
  items.unshift(entry);
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  saveHistory(items);

  if (auth.currentUser) {
    const key = String(item.tmdbId);
    set(ref(db, `users/${auth.currentUser.uid}/history/${key}`), entry).catch(() => {});
  }
}

export function removeFromHistory(tmdbId) {
  saveHistory(loadHistory().filter((h) => h.tmdbId !== tmdbId));
  if (auth.currentUser) {
    remove(ref(db, `users/${auth.currentUser.uid}/history/${String(tmdbId)}`)).catch(() => {});
  }
}

export function getRecentlyViewed() {
  return loadHistory();
}

export function getContinueWatching() {
  return loadHistory().filter(
    (h) => h.progressSeconds > 0 && h.progressSeconds < h.durationSeconds - 30
  );
}

export function updateProgress(tmdbId, progressSeconds, durationSeconds) {
  const items = loadHistory();
  const idx = items.findIndex((h) => h.tmdbId === tmdbId);
  if (idx !== -1) {
    items[idx].progressSeconds = progressSeconds;
    items[idx].durationSeconds = durationSeconds;
    items[idx].watchedDate = new Date().toISOString();
    saveHistory(items);

    if (auth.currentUser) {
      const entry = items[idx];
      set(ref(db, `users/${auth.currentUser.uid}/history/${String(tmdbId)}`), entry).catch(() => {});
    }
  }
}

export function getHistoryItem(tmdbId) {
  return loadHistory().find((h) => h.tmdbId === tmdbId) || null;
}

export async function loadCloudHistory() {
  if (!auth.currentUser) return null;
  try {
    const snap = await get(ref(db, `users/${auth.currentUser.uid}/history`));
    if (!snap.exists()) return null;
    const data = snap.val();
    return Object.values(data).sort(
      (a, b) => new Date(b.watchedDate) - new Date(a.watchedDate)
    );
  } catch {
    return null;
  }
}
