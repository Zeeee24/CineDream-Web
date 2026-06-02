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
