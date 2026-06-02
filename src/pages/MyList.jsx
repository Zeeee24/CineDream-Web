import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWatchlist } from '../services/watchlist';
import { getTVDetails, getMovieDetails, img } from '../services/tmdb';

export default function MyList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, []);

  return (
    <div className="mylist-page">
      <h1 className="mylist-title">My List</h1>
      {loading ? (
        <div className="content-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 8 }} />
          ))}
        </div>
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
        <div className="content-grid">
          {items.map((item) => (
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
    </div>
  );
}
