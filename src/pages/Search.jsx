import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMulti, getMovieGenres, getTVGenres } from '../services/tmdb';
import MediaCard from '../components/MediaCard';
import { SkeletonGrid } from '../components/Skeleton';
import PullToRefresh from '../components/PullToRefresh';

const HISTORY_KEY = 'cinedream_search_history';
const MAX_HISTORY = 8;
const YEARS = ['', '2025', '2024', '2023', '2022', '2020-2021', '2015-2019', '2010-2014', 'Before 2010'];

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(query, history) {
  const filtered = history.filter((h) => h.toLowerCase() !== query.toLowerCase());
  filtered.unshift(query);
  if (filtered.length > MAX_HISTORY) filtered.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  return filtered;
}

function matchesYear(item, yearVal) {
  if (!yearVal) return true;
  const d = item.release_date || item.first_air_date || '';
  const year = parseInt(d.slice(0, 4), 10);
  if (!year) return false;
  if (yearVal.includes('-')) {
    const [from, to] = yearVal.split('-').map(Number);
    return year >= from && year <= to;
  }
  return year === parseInt(yearVal, 10);
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(true);
  const inputRef = useRef(null);

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

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setShowHistory(false);
    if (val.trim()) {
      setLoading(true);
      doSearchRef(val, setResults, setLoading);
    } else {
      setResults([]);
      setShowHistory(true);
    }
  }

  function handleSubmitSearch(q) {
    const val = q || query;
    if (val.trim()) {
      setHistory(saveHistory(val, loadHistory()));
      setShowHistory(false);
    }
  }

  function handleHistoryClick(q) {
    setQuery(q);
    setShowHistory(false);
    setLoading(true);
    doSearchRef(q, setResults, setLoading);
    setHistory(saveHistory(q, loadHistory()));
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }

  async function handleRefresh() {
    if (query.trim()) {
      setLoading(true);
      try {
        const data = await searchMulti(query);
        const items = (data.results || []).filter(
          (r) => r.media_type === 'movie' || r.media_type === 'tv'
        );
        setResults(items);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
  }

  const hasActiveFilters = filter !== 'all' || genreFilter || yearFilter;

  function clearAllFilters() {
    setFilter('all');
    setGenreFilter('');
    setYearFilter('');
  }

  let filtered = results;
  if (filter === 'movies') filtered = filtered.filter((r) => r.media_type === 'movie');
  if (filter === 'tv') filtered = filtered.filter((r) => r.media_type === 'tv');
  if (genreFilter) {
    filtered = filtered.filter((r) => r.genre_ids?.includes(Number(genreFilter)));
  }
  if (yearFilter) {
    filtered = filtered.filter((r) => matchesYear(r, yearFilter));
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="search-page">
      <button className="detail-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="search-header">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder='Search movies and TV shows... (press /)'
            value={query}
            onChange={handleQueryChange}
            onFocus={() => { if (!query) setShowHistory(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitSearch(); }}
            autoFocus
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setShowHistory(true); }} aria-label="Clear search">
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
          <select
            className="genre-dropdown"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">All Years</option>
            {YEARS.filter(Boolean).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button className="chip chip-clear" onClick={clearAllFilters}>Clear Filters</button>
          )}
        </div>
      </div>

      <div className="search-results">
        {showHistory && history.length > 0 && !loading && (
          <div className="search-history">
            <div className="search-history-header">
              <span className="search-history-label">Recent Searches</span>
              <button className="search-history-clear" onClick={clearHistory}>Clear All</button>
            </div>
            <div className="search-history-list">
              {history.map((h, i) => (
                <button key={i} className="search-history-item" onClick={() => handleHistoryClick(h)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
                    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                  </svg>
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonGrid count={12} />
        ) : filtered.length > 0 ? (
          <>
            <div className="search-result-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''} found</div>
            <div className="content-grid content-swap-enter">
              {filtered.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          </>
        ) : query && !showHistory ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <p>No results found for &quot;{query}&quot;</p>
            <p className="empty-hint">Try different keywords or adjust filters</p>
          </div>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <p>Start typing to search movies and TV shows</p>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
