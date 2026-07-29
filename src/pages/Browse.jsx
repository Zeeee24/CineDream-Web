import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { discoverMovies, discoverTV, getMovieGenres, getTVGenres } from '../services/tmdb';
import MediaCard from '../components/MediaCard';
import { SkeletonGrid } from '../components/Skeleton';
import PullToRefresh from '../components/PullToRefresh';

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'primary_release_date.desc', label: 'Newest' },
  { value: 'revenue.desc', label: 'Revenue' },
];

export default function Browse() {
  const navigate = useNavigate();
  const [type, setType] = useState('movie');
  const [genreId, setGenreId] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [genresLoading, setGenresLoading] = useState(true);
  const [animateKey, setAnimateKey] = useState(0);
  const sentinelRef = useRef(null);

  useEffect(() => {
    async function loadGenres() {
      setGenresLoading(true);
      try {
        const [m, t] = await Promise.all([getMovieGenres(), getTVGenres()]);
        setGenres(type === 'movie' ? m : t);
        setGenreId('');
      } catch (err) {
        console.error('Failed to load genres:', err);
      } finally {
        setGenresLoading(false);
      }
    }
    loadGenres();
  }, [type]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setPage(1);
      setHasMore(true);
      try {
        const params = { sort_by: sortBy, page: 1 };
        if (genreId) params.with_genres = genreId;
        const data = type === 'movie' ? await discoverMovies(params) : await discoverTV(params);
        if (cancelled) return;
        setItems(data.results || []);
        setHasMore((data.results || []).length >= 20);
        setAnimateKey((k) => k + 1);
      } catch (err) {
        console.error('Failed to discover:', err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [type, genreId, sortBy]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = { sort_by: sortBy, page: nextPage };
      if (genreId) params.with_genres = genreId;
      const data = type === 'movie' ? await discoverMovies(params) : await discoverTV(params);
      const newItems = data.results || [];
      setItems((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(newItems.length >= 20);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, sortBy, genreId, type, loadingMore, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  async function handleRefresh() {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    try {
      const params = { sort_by: sortBy, page: 1 };
      if (genreId) params.with_genres = genreId;
      const data = type === 'movie' ? await discoverMovies(params) : await discoverTV(params);
      setItems(data.results || []);
      setHasMore((data.results || []).length >= 20);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="browse-page">
      <BackButton />
      <div className="browse-header">
        <h1 className="browse-title">Browse</h1>
        <div className="filter-chips">
          <button
            className={`chip ${type === 'movie' ? 'active' : ''}`}
            onClick={() => setType('movie')}
          >
            Movies
          </button>
          <button
            className={`chip ${type === 'tv' ? 'active' : ''}`}
            onClick={() => setType('tv')}
          >
            TV Shows
          </button>
        </div>
        <div className="genre-chips">
          <button
            className={`chip ${genreId === '' ? 'active' : ''}`}
            onClick={() => setGenreId('')}
          >
            All Genres
          </button>
          {!genresLoading &&
            genres.map((g) => (
              <button
                key={g.id}
                className={`chip ${genreId === String(g.id) ? 'active' : ''}`}
                onClick={() => setGenreId(String(g.id))}
              >
                {g.name}
              </button>
            ))}
        </div>
        <div className="filter-chips" style={{ marginTop: 4 }}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`chip ${sortBy === opt.value ? 'active' : ''}`}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="browse-content">
        {loading ? (
          <SkeletonGrid count={20} />
        ) : items.length > 0 ? (
          <>
            <div className="content-grid content-swap-enter" key={animateKey}>
              {items.map((item) => (
                <MediaCard key={item.id} item={{ ...item, media_type: type }} />
              ))}
            </div>
            {loadingMore && <SkeletonGrid count={10} />}
            <div ref={sentinelRef} style={{ height: 1 }} />
            {!hasMore && items.length > 0 && (
              <div className="load-end">You've reached the end</div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
            </svg>
            <p>No content found for this filter</p>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
