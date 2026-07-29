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

export async function syncLocalStorageToCloud(uid) {
  if (!uid) return;

  try {
    const history = getLocal('cinedream_history');
    if (history && history.length > 0) {
      const histRef = ref(db, `users/${uid}/history`);
      const cloudSnap = await get(histRef);
      const cloudData = cloudSnap.exists() ? cloudSnap.val() : {};

      const merged = {};
      for (const item of history) {
        const key = String(item.tmdbId);
        const cloudItem = cloudData[key];
        if (!cloudItem || new Date(item.watchedDate) > new Date(cloudItem.watchedDate)) {
          merged[key] = item;
        } else {
          merged[key] = cloudItem;
        }
      }
      for (const key of Object.keys(cloudData)) {
        if (!merged[key]) merged[key] = cloudData[key];
      }
      await set(histRef, merged);
    }

    const watchlist = getLocal('cinedream_mylist');
    if (watchlist && watchlist.length > 0) {
      const listRef = ref(db, `users/${uid}/watchlist`);
      const cloudSnap = await get(listRef);
      const cloudData = cloudSnap.exists() ? cloudSnap.val() : {};

      const merged = {};
      for (const item of watchlist) {
        const key = String(item.tmdbId);
        const cloudItem = cloudData[key];
        if (!cloudItem || new Date(item.addedDate) > new Date(cloudItem.addedDate)) {
          merged[key] = item;
        } else {
          merged[key] = cloudItem;
        }
      }
      for (const key of Object.keys(cloudData)) {
        if (!merged[key]) merged[key] = cloudData[key];
      }
      await set(listRef, merged);
    }

    const ratings = getLocal('cinedream_ratings');
    if (ratings && Object.keys(ratings).length > 0) {
      const ratingsRef = ref(db, `users/${uid}/ratings`);
      await set(ratingsRef, ratings);
    }
  } catch (e) {
    console.warn('Cloud sync failed:', e);
  }
}
