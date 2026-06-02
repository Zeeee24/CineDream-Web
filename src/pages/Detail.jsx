import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getMovieDetails, getTVDetails, img } from '../services/tmdb';
import { formatDetailInfo, getYear, getCertification, getTVCertification } from '../utils/helpers';
import { getYouTubeThumbnail } from '../services/youtube';
import { useDevice } from '../hooks/useDevice';
import ScrollRow from '../components/ScrollRow';
import TrailerModal from '../components/TrailerModal';
import Player from '../components/Player';
import { SkeletonHero } from '../components/Skeleton';
import { addToHistory } from '../services/watchHistory';
import { isInWatchlist, toggleWatchlist } from '../services/watchlist';
import { getRating, toggleRating } from '../services/ratings';
import { hapticLight } from '../utils/haptics';
import EpisodeGrid from '../components/EpisodeGrid';
import { getServers } from '../services/servers';

export default function Detail() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const { isTV } = useDevice();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [activeServer, setActiveServer] = useState(0);
  const [, setListVersion] = useState(0);
  const [, setRatingVersion] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const isMovie = type === 'movie';

  useEffect(() => {
    function onScroll() {
      setScrollY(window.scrollY);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleTouchStart(e) {
    if (scrollY > 0) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsSwiping(true);
  }

  function handleTouchMove(e) {
    if (!isSwiping || scrollY > 0) return;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    if (deltaX > Math.abs(deltaY)) return;
    if (deltaY > 0) {
      setSwipeDelta(deltaY);
    }
  }

  function handleTouchEnd() {
    if (swipeDelta > 120) {
      navigate(-1);
    } else {
      setSwipeDelta(0);
    }
    setIsSwiping(false);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const details = isMovie ? await getMovieDetails(id) : await getTVDetails(id);
        setData(details);
        addToHistory({
          tmdbId: Number(id),
          title: details.title || details.name || '',
          posterPath: details.poster_path,
          backdropPath: details.backdrop_path,
          contentType: isMovie ? 'Movie' : 'TV',
          progressSeconds: 0,
          durationSeconds: details.runtime ? details.runtime * 60 : 0,
        });
        if (searchParams.get('play') === 'true') {
          setShowPlayer(true);
        }
        if (searchParams.get('trailer') === 'true') {
          setShowTrailer(true);
        }
      } catch (err) {
        console.error('Failed to load details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    window.scrollTo(0, 0);
  }, [type, id, isMovie, searchParams]);

  if (loading || !data) {
    return (
      <div className="detail-page">
        <SkeletonHero />
      </div>
    );
  }

  const imdbId = isMovie ? (data.imdb_id || null) : (data.external_ids?.imdb_id || null);
  const title = data.title || data.name || '';
  const backdropUrl = img.backdrop(data.backdrop_path, 'original');
  const posterUrl = img.poster(data.poster_path, isTV ? 'w500' : 'w342');
  const year = getYear(data.release_date || data.first_air_date);
  const runtime = data.runtime || null;
  const cert = isMovie ? getCertification(data.content_ratings) : getTVCertification(data.content_ratings);
  const rating = data.vote_average ? data.vote_average.toFixed(1) : null;
  const genres = data.genres || [];
  const cast = data.credits?.cast?.slice(0, 12) || [];
  const similar = data.similar?.results || data.recommendations?.results || [];
  const videos = data.videos?.results || [];
  const trailerKey = videos.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  )?.key || videos.find((v) => v.site === 'YouTube')?.key || null;

  const allServers = getServers();
  const infoLine = formatDetailInfo(year, rating, runtime, cert);
  const seasons = data.seasons || [];

  function handlePlayNow() {
    setShowPlayer(true);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlayNow();
    }
  }

  function handleToggleList() {
    hapticLight();
    toggleWatchlist({
      tmdbId: Number(id),
      title,
      posterPath: data.poster_path || null,
      backdropPath: data.backdrop_path || null,
      mediaType: type,
    });
    setListVersion((v) => v + 1);
  }

  function handleRate(rating) {
    hapticLight();
    toggleRating(Number(id), rating);
    setRatingVersion((v) => v + 1);
  }

  return (
    <div
      className={`detail-page ${isSwiping && swipeDelta > 0 ? 'swiping' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: swipeDelta > 0 ? `translateY(${swipeDelta * 0.5}px)` : undefined,
        opacity: swipeDelta > 0 ? Math.max(1 - swipeDelta / 400, 0.3) : undefined,
        transition: isSwiping ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      {showPlayer && (imdbId || id) ? (
        <Player
          imdbId={imdbId}
          tmdbId={id}
          mediaType={type}
          season={isTV ? selectedSeason : undefined}
          episode={isTV ? selectedEpisode : undefined}
          title={title}
          posterPath={data.poster_path}
          backdropPath={data.backdrop_path}
          seasons={isTV ? seasons : undefined}
          onEpisodeChange={isTV ? (s, e) => { setSelectedSeason(s); setSelectedEpisode(e); } : undefined}
          onClose={() => setShowPlayer(false)}
          activeServer={activeServer}
          setActiveServer={setActiveServer}
        />
      ) : (
        <div className="detail-backdrop-wrapper">
        <button className="detail-back-btn" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/'); }} aria-label="Go back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        {backdropUrl && (
            <img
              src={backdropUrl}
              alt=""
              className="detail-backdrop"
              style={{
                transform: `translateY(${scrollY * 0.3}px) scale(${1 + scrollY * 0.0003})`,
                opacity: Math.max(1 - scrollY / 500, 0.3),
              }}
            />
          )}
          <div className="detail-backdrop-gradient" />
        </div>
      )}

      <div className={`detail-content ${showPlayer ? 'player-active' : ''}`}>
        <div className="detail-top">
          <div className="detail-poster-side">
            {posterUrl && (
              <img src={posterUrl} alt={title} className="detail-poster" />
            )}
          </div>
          <div className="detail-info-side">
            <h1 className="detail-title">{title}</h1>
            <div className="detail-meta">{infoLine}</div>
            <div className="detail-genres">
              {genres.map((g) => (
                <span key={g.id} className="genre-tag">{g.name}</span>
              ))}
            </div>
            {data.tagline && <p className="detail-tagline">&quot;{data.tagline}&quot;</p>}
            <p className="detail-overview">{data.overview}</p>

             <div className="detail-actions">
               <div className="server-selector-wrapper">
                 <select 
                   className="server-select" 
                   value={activeServer} 
                   onChange={(e) => setActiveServer(Number(e.target.value))}
                 >
                   {allServers.map((s, i) => (
                     <option key={s.id} value={i}>{s.name}</option>
                   ))}
                 </select>
               </div>
               <button
                 className="btn btn-primary btn-large"
                 onClick={handlePlayNow}
                 onKeyDown={isTV ? handleKeyDown : undefined}
                 tabIndex={isTV ? 0 : undefined}
               >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M8 5v14l11-7z" />
                 </svg>
                 Play Now
               </button>
              {trailerKey && (
                <button
                  className="btn btn-secondary btn-large"
                  onClick={() => setShowTrailer(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                  Trailer
                </button>
              )}
              <button
                className="btn btn-secondary btn-large"
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) {
                    navigator.share({ title, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).catch(() => {});
                  }
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
              <button
                className={`btn btn-secondary btn-large ${isInWatchlist(Number(id)) ? 'btn-list-active' : ''}`}
                onClick={handleToggleList}
              >
                {isInWatchlist(Number(id)) ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
                {isInWatchlist(Number(id)) ? 'In My List' : 'My List'}
              </button>
              <button
                className={`btn btn-icon-detail ${getRating(Number(id)) === 'up' ? 'btn-icon-active-up' : ''}`}
                onClick={() => handleRate('up')}
                aria-label="Thumbs up"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={getRating(Number(id)) === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </button>
              <button
                className={`btn btn-icon-detail ${getRating(Number(id)) === 'down' ? 'btn-icon-active-down' : ''}`}
                onClick={() => handleRate('down')}
                aria-label="Thumbs down"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={getRating(Number(id)) === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {isTV && seasons.length > 0 && (
          <EpisodeGrid
            tvId={id}
            seasons={seasons}
            onPlayEpisode={(s, e) => {
              setSelectedSeason(s);
              setSelectedEpisode(e);
              setShowPlayer(true);
            }}
          />
        )}

        {trailerKey && (
          <section className="detail-trailer-section">
            <h2 className="section-title">Trailer</h2>
            <div className="trailer-preview" onClick={() => setShowTrailer(true)}>
              <img
                src={getYouTubeThumbnail(trailerKey)}
                alt="Trailer thumbnail"
                className="trailer-thumbnail"
                loading="lazy"
              />
              <div className="trailer-play-overlay">
                <div className="trailer-play-btn">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </section>
        )}

        {cast.length > 0 && (
          <section className="detail-cast-section">
            <h2 className="section-title">Cast</h2>
            <div className="cast-row">
              {cast.map((person) => {
                const profileUrl = img.profile(person.profile_path);
                return (
                  <div key={person.id} className="cast-card" onClick={() => navigate(`/person/${person.id}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/person/${person.id}`); } }}>
                    {profileUrl ? (
                      <img src={profileUrl} alt={person.name} className="cast-photo" loading="lazy" />
                    ) : (
                      <div className="cast-photo cast-placeholder" />
                    )}
                    <div className="cast-name">{person.name}</div>
                    <div className="cast-character">{person.character}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <ScrollRow title="More Like This" items={similar} />
        )}
      </div>



      {showPlayer && !imdbId && !id && (
        <div className="trailer-modal-overlay" onClick={() => setShowPlayer(false)}>
          <div className="trailer-modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#ff4444">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <p style={{ color: 'white', textAlign: 'center' }}>IMDB ID not available for this title. Try watching the trailer instead.</p>
            <button className="btn btn-primary" onClick={() => { setShowPlayer(false); if (trailerKey) setShowTrailer(true); }}>
              Watch Trailer
            </button>
          </div>
        </div>
      )}

      {showTrailer && trailerKey && (
        <TrailerModal videoKey={trailerKey} onClose={() => setShowTrailer(false)} />
      )}
    </div>
  );
}
