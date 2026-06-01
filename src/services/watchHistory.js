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

export function addToHistory(item) {
  const items = loadHistory().filter((h) => h.tmdbId !== item.tmdbId);
  items.unshift({
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
  });
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  saveHistory(items);
}

export function removeFromHistory(tmdbId) {
  saveHistory(loadHistory().filter((h) => h.tmdbId !== tmdbId));
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
  }
}

export function getHistoryItem(tmdbId) {
  return loadHistory().find((h) => h.tmdbId === tmdbId) || null;
}
