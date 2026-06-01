import { useState, useEffect, useRef } from 'react';
import { searchMulti, getMovieGenres, getTVGenres } from '../services/tmdb';
import MediaCard from '../components/MediaCard';
import { SkeletonGrid } from '../components/Skeleton';
import { useDevice } from '../hooks/useDevice';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('');
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const { isTV, isTablet, isDesktop } = useDevice();

  const cols = isTV ? 8 : isDesktop ? 6 : isTablet ? 4 : 2;

  const doSearchRef = useRef(
    debounce(async (q, setResults, setLoading) => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchMulti(q);
        const items = (data.results || []).filter(
          (r) => r.media_type === 'movie' || r.media_type === 'tv'
        );
        setResults(items);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300)
  ).current;

  useEffect(() => {
    async function loadGenres() {
      try {
        const [m, t] = await Promise.all([getMovieGenres(), getTVGenres()]);
        const merged = new Map();
        [...m, ...t].forEach((g) => merged.set(g.id, g));
        setGenres(Array.from(merged.values()));
      } catch (err) {
        console.error('Failed to load genres:', err);
      } finally {
        setGenresLoading(false);
      }
    }
    loadGenres();
  }, []);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setLoading(true);
    doSearchRef(val, setResults, setLoading);
  }

  let filtered = results;
  if (filter === 'movies') filtered = filtered.filter((r) => r.media_type === 'movie');
  if (filter === 'tv') filtered = filtered.filter((r) => r.media_type === 'tv');
  if (genreFilter) {
    filtered = filtered.filter((r) => r.genre_ids?.includes(Number(genreFilter)));
  }

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search movies and TV shows..."
            value={query}
            onChange={handleQueryChange}
            autoFocus
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setResults([]); }} aria-label="Clear search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>
        <div className="filter-chips">
          {['all', 'movies', 'tv'].map((f) => (
            <button
              key={f}
              className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'movies' ? 'Movies' : 'TV Shows'}
            </button>
          ))}
          {!genresLoading && (
            <select
              className="genre-dropdown"
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
            >
              <option value="">All Genres</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="search-results">
        {loading ? (
          <SkeletonGrid count={12} cols={cols} />
        ) : filtered.length > 0 ? (
          <div
            className="content-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {filtered.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        ) : query ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <p>No results found for &quot;{query}&quot;</p>
          </div>
        ) : (
          <div className="empty-state">
            <p>Start typing to search movies and TV shows</p>
          </div>
        )}
      </div>
    </div>
  );
}
