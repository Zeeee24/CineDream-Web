import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'b67e640f1b90b799a41e12416a891ed9';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const tmdb = axios.create({
  baseURL: BASE_URL,
  params: { api_key: API_KEY, language: 'en-US' },
});

const cache = {};

function getCached(key, ttl = 600000) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < ttl) return entry.data;
  return null;
}

function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

async function fetchWithCache(url, params = {}, ttl = 600000) {
  const key = url + JSON.stringify(params);
  const cached = getCached(key, ttl);
  if (cached) return cached;
  const { data } = await tmdb.get(url, { params });
  setCache(key, data);
  return data;
}

export const img = {
  poster: (path, size = 'w342') => path ? `${IMG_BASE}/${size}${path}` : null,
  backdrop: (path, size = 'w1280') => path ? `${IMG_BASE}/${size}${path}` : null,
  profile: (path, size = 'w185') => path ? `${IMG_BASE}/${size}${path}` : null,
  logo: (path, size = 'w154') => path ? `${IMG_BASE}/${size}${path}` : null,
};

export async function getTrending() {
  return fetchWithCache('/trending/all/week');
}

export async function getTrendingMovies() {
  return fetchWithCache('/trending/movie/day');
}

export async function getTrendingTV() {
  return fetchWithCache('/trending/tv/day');
}

export async function getTop10Movies() {
  const data = await fetchWithCache('/trending/movie/day');
  return { ...data, results: data.results.slice(0, 10) };
}

export async function getTop10TV() {
  const data = await fetchWithCache('/trending/tv/day');
  return { ...data, results: data.results.slice(0, 10) };
}

export async function getRecentlyAdded() {
  return fetchWithCache('/movie/now_playing');
}

export async function getBollywood() {
  return fetchWithCache('/discover/movie', {
    with_original_language: 'hi',
    sort_by: 'popularity.desc',
  });
}

export async function getMovieDetails(id) {
  return fetchWithCache(`/movie/${id}`, {
    append_to_response: 'credits,videos,similar,recommendations,external_ids',
  });
}

export async function getTVDetails(id) {
  return fetchWithCache(`/tv/${id}`, {
    append_to_response: 'credits,videos,similar,recommendations,external_ids',
  });
}

export async function searchMulti(query, page = 1) {
  return fetchWithCache('/search/multi', { query, page });
}

export async function discoverMovies(params = {}) {
  return fetchWithCache('/discover/movie', {
    sort_by: 'popularity.desc',
    ...params,
  });
}

export async function discoverTV(params = {}) {
  return fetchWithCache('/discover/tv', {
    sort_by: 'popularity.desc',
    ...params,
  });
}

export async function getMovieGenres() {
  const data = await fetchWithCache('/genre/movie/list');
  return data.genres || [];
}

export async function getTVGenres() {
  const data = await fetchWithCache('/genre/tv/list');
  return data.genres || [];
}

export async function getWatchProviders(movieId) {
  try {
    const { data } = await tmdb.get(`/movie/${movieId}/watch/providers`);
    return data.results || {};
  } catch {
    return {};
  }
}

export async function getTVWatchProviders(tvId) {
  try {
    const { data } = await tmdb.get(`/tv/${tvId}/watch/providers`);
    return data.results || {};
  } catch {
    return {};
  }
}

export async function getTVSeason(tvId, seasonNumber) {
  return fetchWithCache(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getPersonDetails(personId) {
  return fetchWithCache(`/person/${personId}`);
}

export async function getPersonCredits(personId) {
  return fetchWithCache(`/person/${personId}/combined_credits`);
}

export async function getMovieImages(movieId) {
  return fetchWithCache(`/movie/${movieId}/images`, { include_image_language: 'en,null' });
}

export async function getTVImages(tvId) {
  return fetchWithCache(`/tv/${tvId}/images`, { include_image_language: 'en,null' });
}

export async function discoverByGenre(genreIds, params = {}) {
  return fetchWithCache('/discover/movie', {
    with_genres: Array.isArray(genreIds) ? genreIds.join(',') : genreIds,
    sort_by: 'vote_average.desc',
    'vote_count.gte': 200,
    ...params,
  });
}

export async function discoverByRuntime(params = {}) {
  return fetchWithCache('/discover/movie', {
    sort_by: 'popularity.desc',
    'vote_count.gte': 100,
    ...params,
  });
}

export async function discoverByKeywords(keywordIds, params = {}) {
  return fetchWithCache('/discover/movie', {
    with_keywords: Array.isArray(keywordIds) ? keywordIds.join(',') : keywordIds,
    sort_by: 'vote_average.desc',
    'vote_count.gte': 200,
    ...params,
  });
}

export async function getDiscoverByProvider(providerIds) {
  return fetchWithCache('/discover/movie', {
    with_watch_providers: Array.isArray(providerIds) ? providerIds.join('|') : providerIds,
    watch_region: 'US',
    sort_by: 'popularity.desc',
    'vote_count.gte': 100,
  });
}
