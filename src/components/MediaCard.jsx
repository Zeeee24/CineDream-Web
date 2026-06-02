import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { img } from '../services/tmdb';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';
import { isInWatchlist, toggleWatchlist } from '../services/watchlist';
import { getRating, toggleRating } from '../services/ratings';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { truncate } from '../utils/helpers';
import useLongPress from '../hooks/useLongPress';

export default function MediaCard({ item, index, showRank, progress, isHovered, isNeighbor, neighborDirection, onHoverEnter, onHoverLeave, inRow, onLongPress }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { isTV } = useDevice();
  const navigate = useNavigate();

  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const title = item.title || item.name || 'Untitled';
  const posterPath = item.poster_path;
  const posterUrl = img.poster(posterPath, isTV ? 'w500' : 'w342');
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const year = item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || '';

  const inList = isInWatchlist(item.id);
  const myRating = getRating(item.id);
  const [removing, setRemoving] = useState(false);

  const longPressHandlers = useLongPress(
    () => {
      if (!onLongPress) return;
      hapticMedium();
      setRemoving(true);
      setTimeout(() => onLongPress(item.id), 300);
    },
    {
      delay: 500,
      onStart: () => {},
      onCancel: () => {},
    }
  );

  function handleClick() {
    hapticLight();
    navigate(`/${mediaType}/${item.id}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  function handleToggleList(e) {
    e.stopPropagation();
    hapticLight();
    toggleWatchlist({
      tmdbId: item.id,
      title,
      posterPath: posterPath || null,
      backdropPath: item.backdrop_path || null,
      mediaType,
    });
  }

  function handleRate(e, rating) {
    e.stopPropagation();
    hapticLight();
    toggleRating(item.id, rating);
  }

  function handleExpand(e) {
    e.stopPropagation();
    hapticLight();
    navigate(`/${mediaType}/${item.id}`);
  }

  const progressPct = progress > 0 ? Math.min((progress.progressSeconds / progress.durationSeconds) * 100, 100) : 0;

  let cardClass = `media-card ${isTV ? 'tv-focusable' : ''}`;
  if (inRow) {
    if (isHovered) cardClass += ' hovered';
    else if (isNeighbor) cardClass += ` neighbor-${neighborDirection}`;
  }
  if (removing) cardClass += ' removing';

  return (
    <div
      ref={ref}
      className={cardClass}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isTV ? 0 : undefined}
      role="button"
      aria-label={`View ${title}`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={inRow ? () => onHoverEnter?.(index) : undefined}
      onMouseLeave={inRow ? onHoverLeave : undefined}
      {...longPressHandlers}
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
        {progressPct > 0 && (
          <div className="card-progress-bar">
            <div className="card-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}
        <div className="card-overlay">
          <div className="card-play-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          {rating && (
            <div className="card-rating">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>{rating}</span>
            </div>
          )}
          <div className="card-year">{year}</div>
        </div>
        {removing && (
          <div className="card-remove-overlay">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}
      </div>

      {isHovered && inRow && (
        <div className="card-expanded-overlay">
          <div className="card-expanded-actions">
            <button className="card-action-btn play" onClick={handleClick} aria-label="Play">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              className={`card-action-btn ${inList ? 'active' : ''}`}
              onClick={handleToggleList}
              aria-label={inList ? 'Remove from My List' : 'Add to My List'}
            >
              {inList ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>
            <button
              className={`card-action-btn ${myRating === 'up' ? 'active-up' : ''}`}
              onClick={(e) => handleRate(e, 'up')}
              aria-label="Thumbs up"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={myRating === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </button>
            <button
              className={`card-action-btn ${myRating === 'down' ? 'active-down' : ''}`}
              onClick={(e) => handleRate(e, 'down')}
              aria-label="Thumbs down"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={myRating === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
            </button>
            <button className="card-action-btn expand" onClick={handleExpand} aria-label="More info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          {item.overview && (
            <p className="card-synopsis">{truncate(item.overview, 120)}</p>
          )}
          <div className="card-expanded-meta">
            {rating && <span className="card-match">{Math.round(parseFloat(rating) * 10)}% Match</span>}
            {year && <span className="card-meta-tag">{year}</span>}
          </div>
        </div>
      )}

      <div className="card-title">{title}</div>
    </div>
  );
}
