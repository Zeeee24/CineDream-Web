import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { img } from '../services/tmdb';
import { formatRuntime, getYear, truncate } from '../utils/helpers';
import { useDevice } from '../hooks/useDevice';

export default function HeroBanner({ items = [], interval = 8000 }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const navigate = useNavigate();
  const { isTV } = useDevice();

  const nextSlide = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % items.length);
      setFading(false);
    }, 500);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(nextSlide, interval);
    return () => clearInterval(timer);
  }, [nextSlide, items.length, interval]);

  if (!items.length) return <div className="hero-banner skeleton skeleton-hero" />;

  const item = items[current];
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const title = item.title || item.name || '';
  const backdropUrl = img.backdrop(item.backdrop_path, 'original');
  const year = getYear(item.release_date || item.first_air_date);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const runtime = item.runtime || null;

  function handlePlay() {
    navigate(`/${mediaType}/${item.id}?autoplay=true`);
  }

  function handleDetails() {
    navigate(`/${mediaType}/${item.id}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlay();
    }
  }

  return (
    <section
      className={`hero-banner ${fading ? 'hero-fade-out' : 'hero-fade-in'}`}
      onKeyDown={isTV ? handleKeyDown : undefined}
      tabIndex={isTV ? 0 : undefined}
      role="banner"
    >
      <div className="hero-backdrop">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt=""
            className="hero-backdrop-img"
          />
        )}
        <div className="hero-gradient" />
      </div>
      <div className="hero-content">
        <h1 className="hero-title">{title}</h1>
        <div className="hero-meta">
          {year && <span>{year}</span>}
          {rating && (
            <span className="hero-rating">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {rating}
            </span>
          )}
          {runtime && <span>{formatRuntime(runtime)}</span>}
        </div>
        <p className="hero-description">{truncate(item.overview, isTV ? 300 : 180)}</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={handlePlay}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play Now
          </button>
          <button className="btn btn-secondary" onClick={handleDetails}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            More Info
          </button>
        </div>
      </div>
      <div className="hero-dots">
        {items.slice(0, 10).map((_, i) => (
          <button
            key={i}
            className={`hero-dot ${i === current ? 'active' : ''}`}
            onClick={() => {
              setFading(true);
              setTimeout(() => {
                setCurrent(i);
                setFading(false);
              }, 500);
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
