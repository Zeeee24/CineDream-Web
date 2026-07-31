import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWatchlist } from '../services/watchlist';
import { getTVDetails, getMovieDetails, img } from '../services/tmdb';
import { SkeletonGrid } from '../components/Skeleton';

export default function MyList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const loadedRef = useRef(false);

  async function loadList() {
    setLoading(true);
    const list = getWatchlist();
    const enriched = await Promise.all(
      list.map(async (item) => {
        try {
          const details = item.mediaType === 'tv'
            ? await getTVDetails(item.tmdbId)
            : await getMovieDetails(item.tmdbId);
          return {
            ...item,
            posterPath: details.poster_path || item.posterPath,
            backdropPath: details.backdrop_path || item.backdropPath,
            rating: details.vote_average ? details.vote_average.toFixed(1) : null,
            year: (details.release_date || details.first_air_date || '').slice(0, 4),
          };
        } catch {
          return { ...item, rating: null, year: '' };
        }
      })
    );
    setItems(enriched);
    setLoading(false);
    loadedRef.current = true;
  }

  useEffect(() => {
    loadList();
    function handleVisibility() {
      if (document.visibilityState === 'visible') loadList();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const filtered = searchQuery.trim()
    ? items.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : items;

  return (
    <div className="mylist-page">
      <h1 className="mylist-title">My List</h1>
      {loading ? (
        <SkeletonGrid count={8} />
      ) : items.length === 0 ? (
        <div className="empty-page">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <p>Your list is empty</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Add movies and shows to your list to keep track of what you want to watch.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Content</button>
        </div>
      ) : (
        <>
          <div className="mylist-search-wrapper">
            <svg className="mylist-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              className="mylist-search-input"
              type="text"
              placeholder="Search my list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="mylist-search-clear" onClick={() => setSearchQuery('')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            )}
          </div>
          <div className="mylist-count">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</div>
          {filtered.length === 0 ? (
            <div className="empty-page">
              <p>No results for "{searchQuery}"</p>
              <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>Clear Search</button>
            </div>
          ) : (
            <div className="content-grid">
              {filtered.map((item) => (
                <div
                  key={item.tmdbId}
                  className="media-card"
                  onClick={() => navigate(`/${item.mediaType}/${item.tmdbId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/${item.mediaType}/${item.tmdbId}`); } }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-poster-wrapper">
                    {item.posterPath ? (
                      <img src={img.poster(item.posterPath, 'w342')} alt={item.title} className="card-poster" loading="lazy" />
                    ) : (
                      <div className="card-poster skeleton" />
                    )}
                  </div>
                  <div className="card-title">{item.title}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
