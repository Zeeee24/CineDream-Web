import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getMovieDetails, getTVDetails, getTVSeason } from '../services/tmdb';
import { getServers, getEmbedUrl, checkAllServers } from '../services/servers';
import { addToHistory, updateEpisodeProgress, getResumePosition } from '../services/watchHistory';
import WatchParty from '../components/WatchParty';

const allServers = getServers();

export default function WatchPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isMovie = type === 'movie';

  const initialSeason = isMovie ? null : Number(searchParams.get('s')) || 1;
  const initialEpisode = isMovie ? null : Number(searchParams.get('e')) || 1;

  const [data, setData] = useState(null);
  const [activeServer, setActiveServer] = useState(0);
  const [health, setHealth] = useState({});
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesSeason, setEpisodesSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [fallbackCountdown, setFallbackCountdown] = useState(null);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resumePosition, setResumePosition] = useState(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const playerRef = useRef(null);
  const loadTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const season = isMovie ? null : episodesSeason;
  const episode = isMovie ? null : currentEpisode;

  const validSeasons = (data?.seasons && data.seasons.length > 0)
    ? data.seasons.filter((s) => s.season_number > 0)
    : [];

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const toggleFullscreen = useCallback(() => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

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
      } catch (err) {
        console.error('Failed to load details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    window.scrollTo(0, 0);
  }, [type, id, isMovie]);

  useEffect(() => {
    if (season) setEpisodesSeason(season);
  }, [season]);

  useEffect(() => {
    setCurrentEpisode(episode || 1);
  }, [episode]);

  useEffect(() => {
    const pos = getResumePosition(Number(id), season, episode);
    if (pos && pos.progressSeconds > 30) {
      setResumePosition(pos);
      setShowResumeBanner(true);
    }
  }, [id, season, episode]);

  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      setWatchTime((prev) => {
        const newTime = prev + 10;
        updateEpisodeProgress(Number(id), season || null, episode || null, newTime, 3600);
        return newTime;
      });
    }, 10000);
    return () => clearInterval(progressIntervalRef.current);
  }, [id, season, episode]);

  useEffect(() => {
    checkAllServers().then((h) => {
      setHealth(h);
      if (h[allServers[0].id] === false) {
        const firstOnline = allServers.findIndex((s) => h[s.id] !== false);
        if (firstOnline > 0) setActiveServer(firstOnline);
      }
    });
  }, []);

  useEffect(() => {
    if (!isMovie && id && episodesSeason) {
      let cancelled = false;
      setEpisodesLoading(true);
      getTVSeason(id, episodesSeason)
        .then((data) => {
          if (!cancelled) setEpisodes(data.episodes || []);
        })
        .catch(() => {
          if (!cancelled) setEpisodes([]);
        })
        .finally(() => {
          if (!cancelled) setEpisodesLoading(false);
        });
      return () => { cancelled = true; };
    }
  }, [id, episodesSeason, isMovie]);

  useEffect(() => {
    if (loading) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = setTimeout(() => {
        setLoading(false);
        setLoadError(true);
      }, 15000);
    } else {
      clearTimeout(loadTimerRef.current);
    }
    return () => clearTimeout(loadTimerRef.current);
  }, [loading, activeServer]);

  useEffect(() => {
    if (loadError) {
      setFallbackCountdown(5);
      fallbackTimerRef.current = setInterval(() => {
        setFallbackCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(fallbackTimerRef.current);
            setActiveServer((s) => (s + 1) % allServers.length);
            setLoading(true);
            setLoadError(false);
            setFallbackCountdown(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setFallbackCountdown(null);
      clearInterval(fallbackTimerRef.current);
    }
    return () => clearInterval(fallbackTimerRef.current);
  }, [loadError]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        handleBack();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveServer((s) => (s - 1 + allServers.length) % allServers.length);
        setLoading(true);
        setLoadError(false);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveServer((s) => (s + 1) % allServers.length);
        setLoading(true);
        setLoadError(false);
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key) - 1;
        if (idx < allServers.length) {
          setActiveServer(idx);
          setLoading(true);
          setLoadError(false);
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleBack, toggleFullscreen]);

  function switchServer(index) {
    setActiveServer(index);
    setLoading(true);
    setLoadError(false);
    setFallbackCountdown(null);
    clearTimeout(loadTimerRef.current);
    clearInterval(fallbackTimerRef.current);
  }

  function handleEpisodeChange(newSeason, newEpisode) {
    setEpisodesSeason(newSeason);
    setCurrentEpisode(newEpisode);
    setLoading(true);
    setLoadError(false);
    setFallbackCountdown(null);
    clearTimeout(loadTimerRef.current);
    clearInterval(fallbackTimerRef.current);
    const params = new URLSearchParams();
    params.set('s', String(newSeason));
    params.set('e', String(newEpisode));
    navigate(`/watch/${type}/${id}?${params.toString()}`, { replace: true });
  }

  if (loading && !data) {
    return (
      <div className="watch-page">
        <div className="watch-loading-skeleton" />
      </div>
    );
  }

  const title = data?.title || data?.name || 'Now Playing';
  const year = data ? new Date(data.release_date || data.first_air_date || '').getFullYear() || null : null;
  const rating = data?.vote_average ? data.vote_average.toFixed(1) : null;
  const imdbId = isMovie ? (data?.imdb_id || null) : (data?.external_ids?.imdb_id || null);

  const current = allServers[activeServer];
  const embedUrl = getEmbedUrl(current, imdbId || id, type, season, episode, id);

  return (
    <div className="watch-page">
      <div className="watch-header">
        <button className="watch-header-back" onClick={handleBack} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="watch-header-info">
          <h1 className="watch-header-title">{title}</h1>
          <div className="watch-header-meta">
            {year && <span>{year}</span>}
            {rating && <span>{rating}</span>}
            {!isMovie && season && episode && (
              <span>S{season}E{episode}</span>
            )}
          </div>
        </div>
      </div>

      <div className="watch-player-container" ref={playerRef}>
        {showResumeBanner && resumePosition && (
          <div className="player-resume-banner glass-heavy">
            <div className="player-resume-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Resume from {Math.floor(resumePosition.progressSeconds / 60)}:{String(resumePosition.progressSeconds % 60).padStart(2, '0')}</span>
            </div>
            <div className="player-resume-actions">
              <button className="btn btn-primary" onClick={() => setShowResumeBanner(false)}>
                Resume
              </button>
              <button className="btn btn-secondary" onClick={() => setShowResumeBanner(false)}>
                Start Over
              </button>
            </div>
          </div>
        )}

        <iframe
          key={`${activeServer}-${id}-${season}-${episode}`}
          src={embedUrl}
          title={title}
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="origin"
          className="player-iframe"
          onLoad={() => { setLoading(false); setLoadError(false); setFallbackCountdown(null); clearInterval(fallbackTimerRef.current); clearTimeout(loadTimerRef.current); }}
          onError={() => { setLoading(false); setLoadError(true); }}
        />

        {loading && (
          <div className="player-loading">
            <div className="player-loading-spinner" />
            <span>Loading from {current.name}...</span>
          </div>
        )}

        {loadError && (
          <div className="player-error">
            <p>Failed to load from {current.name}</p>
            {fallbackCountdown !== null && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                Switching to next server in {fallbackCountdown}s
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => {
                clearInterval(fallbackTimerRef.current);
                setFallbackCountdown(null);
                setActiveServer((s) => (s + 1) % allServers.length);
                setLoading(true);
                setLoadError(false);
              }}>
                Try Next Server
              </button>
              {fallbackCountdown !== null && (
                <button className="btn btn-secondary" onClick={() => {
                  clearInterval(fallbackTimerRef.current);
                  setFallbackCountdown(null);
                }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="watch-controls">
        <div className="player-controls-row">
          <div className="player-server-dropdown-wrapper">
            <select
              className="player-server-dropdown"
              value={activeServer}
              onChange={(e) => switchServer(Number(e.target.value))}
            >
              {allServers.map((s, i) => (
                <option key={s.id} value={i} disabled={health[s.id] === false}>
                  {health[s.id] === false ? '🔴 ' : health[s.id] ? '🟢 ' : '⚪ '}{s.name}{s.label ? ` (${s.label})` : ''}
                </option>
              ))}
            </select>
          </div>
          {!isMovie && validSeasons.length > 0 && (
            <div className="player-season-episode">
              <select
                className="player-control-select"
                value={episodesSeason}
                onChange={(e) => handleEpisodeChange(Number(e.target.value), 1)}
              >
                {validSeasons.map((s) => (
                  <option key={s.id} value={s.season_number}>
                    Season {s.season_number}
                  </option>
                ))}
              </select>
              <select
                className="player-control-select"
                value={episode || 1}
                onChange={(e) => handleEpisodeChange(episodesSeason, Number(e.target.value))}
              >
                {episodesLoading ? (
                  <option value={episode || 1}>Loading...</option>
                ) : episodes.length > 0 ? (
                  episodes.map((ep) => (
                    <option key={ep.id} value={ep.episode_number}>
                      E{ep.episode_number} — {ep.name || `Episode ${ep.episode_number}`}
                    </option>
                  ))
                ) : (
                  <option value={1}>Episode 1</option>
                )}
              </select>
            </div>
          )}
        </div>

        <div className="player-actions-row">
          <button
            className="player-action-pill"
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title, url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url).catch(() => {});
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
          <button
            className={`player-action-pill ${isFullscreen ? 'active' : ''}`}
            onClick={toggleFullscreen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
            </svg>
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            className={`player-action-pill ${showWatchParty ? 'active' : ''}`}
            onClick={() => setShowWatchParty(!showWatchParty)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            Watch Party
          </button>
        </div>

        {showWatchParty && (
          <WatchParty
            tmdbId={id}
            mediaType={type}
            season={season}
            episode={episode}
            activeServer={activeServer}
            onSync={(s, e, server) => { switchServer(server); }}
          />
        )}
      </div>
    </div>
  );
}
