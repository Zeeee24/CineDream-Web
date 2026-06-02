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
  const items = load().filter((h) => h.tmdbId !== item.tmdbId);
  items.unshift({
    tmdbId: item.tmdbId,
    title: item.title,
    posterPath: item.posterPath || null,
    backdropPath: item.backdropPath || null,
    mediaType: item.mediaType || 'movie',
    addedDate: new Date().toISOString(),
  });
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  save(items);
}

export function removeFromWatchlist(tmdbId) {
  save(load().filter((h) => h.tmdbId !== tmdbId));
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
