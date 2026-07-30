import { ref, set, get } from 'firebase/database';
import { db } from '../config/firebase';

function getLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function mergeArrayLocalCloud(localItems, cloudItems, dateKey) {
  const map = new Map();
  for (const item of cloudItems) {
    map.set(String(item.tmdbId), item);
  }
  for (const item of localItems) {
    const key = String(item.tmdbId);
    const existing = map.get(key);
    if (!existing || new Date(item[dateKey]) > new Date(existing[dateKey])) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function mergeObjectLocalCloud(localObj, cloudObj) {
  const merged = { ...cloudObj };
  for (const [key, val] of Object.entries(localObj || {})) {
    const existing = merged[key];
    if (!existing || (val.updatedAt && (!existing.updatedAt || val.updatedAt > existing.updatedAt))) {
      merged[key] = val;
    }
  }
  return merged;
}

export async function syncLocalStorageToCloud(uid) {
  if (!uid) return;

  try {
    await Promise.all([
      syncHistory(uid),
      syncWatchlist(uid),
      syncWatchedEpisodes(uid),
      syncEpisodeProgress(uid),
      syncRatings(uid),
    ]);
  } catch (e) {
    console.warn('Cloud sync failed:', e);
  }
}

async function syncHistory(uid) {
  const local = getLocal('cinedream_history') || [];
  const histRef = ref(db, `users/${uid}/history`);
  const cloudSnap = await get(histRef);
  const cloud = cloudSnap.exists() ? Object.values(cloudSnap.val()) : [];

  const merged = mergeArrayLocalCloud(local, cloud, 'watchedDate');
  if (merged.length > 0) {
    const obj = {};
    for (const item of merged) {
      obj[String(item.tmdbId)] = item;
    }
    await set(histRef, obj);
  }
  setLocal('cinedream_history', merged);
}

async function syncWatchlist(uid) {
  const local = getLocal('cinedream_mylist') || [];
  const listRef = ref(db, `users/${uid}/watchlist`);
  const cloudSnap = await get(listRef);
  const cloud = cloudSnap.exists() ? Object.values(cloudSnap.val()) : [];

  const merged = mergeArrayLocalCloud(local, cloud, 'addedDate');
  if (merged.length > 0) {
    const obj = {};
    for (const item of merged) {
      obj[String(item.tmdbId)] = item;
    }
    await set(listRef, obj);
  }
  setLocal('cinedream_mylist', merged);
}

async function syncWatchedEpisodes(uid) {
  const local = getLocal('cinedream_watched_episodes') || {};
  const ref_path = ref(db, `users/${uid}/watchedEpisodes`);
  const cloudSnap = await get(ref_path);
  const cloud = cloudSnap.exists() ? cloudSnap.val() : {};

  const merged = { ...cloud, ...local };
  await set(ref_path, merged);
  setLocal('cinedream_watched_episodes', merged);
}

async function syncEpisodeProgress(uid) {
  const local = getLocal('cinedream_ep_progress') || {};
  const ref_path = ref(db, `users/${uid}/episodeProgress`);
  const cloudSnap = await get(ref_path);
  const cloud = cloudSnap.exists() ? cloudSnap.val() : {};

  const merged = mergeObjectLocalCloud(local, cloud);
  await set(ref_path, merged);
  setLocal('cinedream_ep_progress', merged);
}

async function syncRatings(uid) {
  const local = getLocal('cinedream_ratings') || {};
  if (Object.keys(local).length > 0) {
    const ratingsRef = ref(db, `users/${uid}/ratings`);
    const cloudSnap = await get(ratingsRef);
    const cloud = cloudSnap.exists() ? cloudSnap.val() : {};
    const merged = { ...cloud, ...local };
    await set(ratingsRef, merged);
    setLocal('cinedream_ratings', merged);
  }
}
