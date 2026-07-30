import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { img, getMovieImages, getTVImages } from '../services/tmdb';
import { formatRuntime, getYear, truncate } from '../utils/helpers';
import { useDevice } from '../hooks/useDevice';
import { isInWatchlist, toggleWatchlist } from '../services/watchlist';
import { hapticLight } from '../utils/haptics';

export default function HeroBanner({ items = [], interval = 8000 }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [prevIndex, setPrevIndex] = useState(-1);
  const [logos, setLogos] = useState({});
  const [imgLoaded, setImgLoaded] = useState(false);
  const [, setListVersion] = useState(0);
  const [nowTimestamp] = useState(() => Date.now());
  const navigate = useNavigate();
  const { isTV } = useDevice();
  const logoCacheRef = useRef({});
  const fadeTimerRef = useRef(null);

  const nextSlide = useCallback(() => {
    clearTimeout(fadeTimerRef.current);
    setPrevIndex(current);
    setFading(true);
    setImgLoaded(false);
    fadeTimerRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % items.length);
      setFading(false);
    }, 500);
  }, [current, items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(nextSlide, interval);
    return () => { clearInterval(timer); clearTimeout(fadeTimerRef.current); };
  }, [nextSlide, items.length, interval]);

  useEffect(() => {
    if (!items.length) return;
    items.forEach((item) => {
      if (logoCacheRef.current[item.id]) return;
      const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
      const fetchImages = mediaType === 'tv' ? getTVImages : getMovieImages;
      fetchImages(item.id).then((data) => {
        const logos = data.logos || [];
        const bestLogo = logos.find((l) => l.iso_639_1 === 'en') || logos[0] || null;
        if (bestLogo) {
          logoCacheRef.current[item.id] = img.logo(bestLogo.file_path, 'w500');
          setLogos((prev) => ({ ...prev, [item.id]: logoCacheRef.current[item.id] }));
        }
      }).catch(() => {});
    });
  }, [items]);

  if (!items.length) return <div className="hero-banner skeleton skeleton-hero" />;

  const item = items[current];
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const title = item.title || item.name || '';
  const backdropUrl = img.backdrop(item.backdrop_path, 'original');
  const prevBackdropUrl = prevIndex >= 0 && items[prevIndex] ? img.backdrop(items[prevIndex].backdrop_path, 'original') : null;
  const year = getYear(item.release_date || item.first_air_date);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const runtime = item.runtime || null;
  const isRecent = item.release_date
    ? new Date(item.release_date) > new Date(nowTimestamp - 90 * 86400000)
    : item.first_air_date
    ? new Date(item.first_air_date) > new Date(nowTimestamp - 90 * 86400000)
    : false;
  const isTrending = item.vote_count > 1000 && item.vote_average >= 7.5;
  const logoUrl = logos[item.id] || null;

  function handlePlay() {
    navigate(`/${mediaType}/${item.id}?play=true`);
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

  const inList = isInWatchlist(item.id);

  function handleToggleList() {
    hapticLight();
    toggleWatchlist({
      tmdbId: item.id,
      title,
      posterPath: item.poster_path || null,
      backdropPath: item.backdrop_path || null,
      mediaType,
    });
    setListVersion((v) => v + 1);
  }

  return (
    <section
      className={`hero-banner ${fading ? 'hero-fade-out' : 'hero-fade-in'}`}
      onKeyDown={isTV ? handleKeyDown : undefined}
      tabIndex={isTV ? 0 : undefined}
      role="banner"
    >
      <div className="hero-backdrop">
        {prevBackdropUrl && fading && (
          <img
            src={prevBackdropUrl}
            alt=""
            className="hero-backdrop-img"
            style={{ opacity: 0, transition: 'opacity 0.5s ease' }}
          />
        )}
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt=""
            className={`hero-backdrop-img hero-backdrop-zoom ${imgLoaded ? 'loaded' : ''}`}
            onLoad={() => setImgLoaded(true)}
          />
        )}
        <div className="hero-gradient" />
        <div className="hero-gradient-left" />
      </div>
      <div className="hero-content">
        <div className="hero-badges">
          {isRecent && <span className="hero-badge hero-badge-new">New</span>}
          {isTrending && <span className="hero-badge hero-badge-trending">Trending</span>}
          {mediaType === 'tv' && <span className="hero-badge hero-badge-type">Series</span>}
        </div>
        {logoUrl ? (
          <img src={logoUrl} alt={title} className="hero-logo-img" />
        ) : (
          <h1 className="hero-title hero-title-gradient">{title}</h1>
        )}
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
          <button className="btn btn-primary btn-glow-play" onClick={handlePlay}>
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
          <button
            className={`btn btn-icon ${inList ? 'btn-icon-active' : ''}`}
            onClick={handleToggleList}
            aria-label={inList ? 'Remove from My List' : 'Add to My List'}
          >
            {inList ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="hero-dots">
        {items.slice(0, 10).map((_, i) => (
          <button
            key={i}
            className={`hero-dot ${i === current ? 'active' : ''}`}
            onClick={() => {
              clearTimeout(fadeTimerRef.current);
              setPrevIndex(current);
              setFading(true);
              setImgLoaded(false);
              fadeTimerRef.current = setTimeout(() => {
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
