import { useInView } from 'react-intersection-observer';
import { img } from '../services/tmdb';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';

export default function MediaCard({ item, index, showRank, type = 'poster' }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { isTV } = useDevice();
  const navigate = useNavigate();

  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const title = item.title || item.name || 'Untitled';
  const posterPath = item.poster_path;
  const posterUrl = img.poster(posterPath, isTV ? 'w500' : 'w342');
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  function handleClick() {
    navigate(`/${mediaType}/${item.id}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <div
      ref={ref}
      className={`media-card ${isTV ? 'tv-focusable' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isTV ? 0 : undefined}
      role="button"
      aria-label={`View ${title}`}
      style={{ cursor: 'pointer' }}
    >
      {showRank && (
        <span className="rank-badge">{(index || 0) + 1}</span>
      )}
      <div className="card-poster-wrapper">
        {inView && posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="card-poster"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="card-poster skeleton" />
        )}
        <div className="card-overlay">
          {rating && (
            <div className="card-rating">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>{rating}</span>
            </div>
          )}
          <div className="card-year">
            {item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || ''}
          </div>
        </div>
      </div>
      <div className="card-title">{title}</div>
    </div>
  );
}
