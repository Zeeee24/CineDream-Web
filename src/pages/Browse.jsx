import { useState, useEffect } from 'react';
import { discoverMovies, discoverTV, getMovieGenres, getTVGenres } from '../services/tmdb';
import MediaCard from '../components/MediaCard';
import { SkeletonGrid } from '../components/Skeleton';
import { useDevice } from '../hooks/useDevice';

export default function Browse() {
  const [type, setType] = useState('movie');
  const [genreId, setGenreId] = useState('');
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genresLoading, setGenresLoading] = useState(true);
  const { isTV, isTablet, isDesktop } = useDevice();

  const cols = isTV ? 8 : isDesktop ? 6 : isTablet ? 4 : 2;

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
    async function load() {
      setLoading(true);
      try {
        const params = {};
        if (genreId) params.with_genres = genreId;
        const data = type === 'movie' ? await discoverMovies(params) : await discoverTV(params);
        setItems(data.results || []);
      } catch (err) {
        console.error('Failed to discover:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type, genreId]);

  return (
    <div className="browse-page">
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
      </div>

      <div className="browse-content">
        {loading ? (
          <SkeletonGrid count={20} cols={cols} />
        ) : items.length > 0 ? (
          <div
            className="content-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {items.map((item) => (
              <MediaCard key={item.id} item={{ ...item, media_type: type }} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No content found</p>
          </div>
        )}
      </div>
    </div>
  );
}
