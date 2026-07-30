import { useState, useEffect, useCallback, useRef } from 'react';
import { getServers, getEmbedUrl, checkAllServers } from '../services/servers';
import { getTVSeason } from '../services/tmdb';
import { addToHistory } from '../services/watchHistory';
import WatchParty from './WatchParty';

const allServers = getServers();

export default function Player({ imdbId, tmdbId, mediaType, season, episode, title, posterPath, backdropPath, seasons, onEpisodeChange, onClose }) {
  const [activeServer, setActiveServer] = useState(0);
  const [health, setHealth] = useState({});
  const [showServerPanel, setShowServerPanel] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesSeason, setEpisodesSeason] = useState(season || 1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fallbackCountdown, setFallbackCountdown] = useState(null);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef(null);
  const viewportRef = useRef(null);
  const hideTimerRef = useRef(null);
  const loadTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  const isTV = mediaType === 'tv';
  const validSeasons = (seasons && seasons.length > 0)
    ? seasons.filter((s) => s.season_number > 0)
    : [];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = useCallback(() => {
    document.body.style.overflow = '';
    try {
      addToHistory({
        tmdbId: Number(tmdbId),
        title: title || 'Untitled',
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        contentType: isTV ? 'TV' : 'Movie',
        season: season || null,
        episode: episode || null,
        progressSeconds: 1,
        durationSeconds: 3600,
      });
    } catch (e) {
      console.warn('Failed to save history:', e);
    }
    onClose();
  }, [tmdbId, title, posterPath, backdropPath, isTV, season, episode, onClose]);

  function goToEpisode(newSeason, newEpisode) {
    if (onEpisodeChange) onEpisodeChange(newSeason, newEpisode);
    setEpisodesSeason(newSeason);
    setLoading(true);
    setLoadError(false);
    showControls();
  }

  function handlePrevEpisode() {
    if (!isTV || !season || !episode) return;
    if (episodes.length > 0) {
      const idx = episodes.findIndex((e) => e.episode_number === episode);
      if (idx > 0) {
        goToEpisode(season, episodes[idx - 1].episode_number);
      } else if (season > 1) {
        const prevSeasonNum = season - 1;
        setEpisodesSeason(prevSeasonNum);
        getTVSeason(tmdbId, prevSeasonNum).then((data) => {
          const prevEps = data.episodes || [];
          if (prevEps.length > 0) {
            goToEpisode(prevSeasonNum, prevEps[prevEps.length - 1].episode_number);
          }
        }).catch(() => {});
      }
    } else if (season > 1) {
      const prevSeasonNum = season - 1;
      setEpisodesSeason(prevSeasonNum);
      getTVSeason(tmdbId, prevSeasonNum).then((data) => {
        const prevEps = data.episodes || [];
        if (prevEps.length > 0) {
          goToEpisode(prevSeasonNum, prevEps[prevEps.length - 1].episode_number);
        }
      }).catch(() => {});
    }
  }

  function handleNextEpisode() {
    if (!isTV || !season || !episode) return;
    if (episodes.length > 0) {
      const idx = episodes.findIndex((e) => e.episode_number === episode);
      if (idx >= 0 && idx < episodes.length - 1) {
        goToEpisode(season, episodes[idx + 1].episode_number);
      } else if (validSeasons.length > 0) {
        const lastSeason = validSeasons[validSeasons.length - 1];
        if (season < lastSeason.season_number) {
          const nextSeasonNum = season + 1;
          setEpisodesSeason(nextSeasonNum);
          getTVSeason(tmdbId, nextSeasonNum).then((data) => {
            const nextEps = data.episodes || [];
            if (nextEps.length > 0) {
              goToEpisode(nextSeasonNum, nextEps[0].episode_number);
            }
          }).catch(() => {});
        }
      }
    } else if (validSeasons.length > 0) {
      const lastSeason = validSeasons[validSeasons.length - 1];
      if (season < lastSeason.season_number) {
        const nextSeasonNum = season + 1;
        setEpisodesSeason(nextSeasonNum);
        getTVSeason(tmdbId, nextSeasonNum).then((data) => {
          const nextEps = data.episodes || [];
          if (nextEps.length > 0) {
            goToEpisode(nextSeasonNum, nextEps[0].episode_number);
          }
        }).catch(() => {});
      }
    }
  }

  const canGoPrev = isTV && season > 1;
  const canGoNext = isTV && validSeasons.length > 0 && season < validSeasons[validSeasons.length - 1].season_number;

  function showControls() {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);
  }

  function handlePlayerMouseMove() {
    showControls();
  }

  function handlePlayerTouchStart() {
    if (controlsVisible) {
      setControlsVisible(false);
      clearTimeout(hideTimerRef.current);
    } else {
      showControls();
    }
  }

  function handleFullOverlayTap(e) {
    e.preventDefault();
    e.stopPropagation();
    showControls();
  }

  useEffect(() => {
    showControls();
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  useEffect(() => {
    checkAllServers().then((h) => {
      setHealth(h);
      if (h[allServers[0].id] === false) {
        const firstOnline = allServers.findIndex((s) => h[s.id] !== false);
        if (firstOnline > 0) setActiveServer(firstOnline);
      }
    });

    function handleKey(e) {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        showControls();
        if (showServerPanel) {
          e.preventDefault();
          setActiveServer((prev) => {
            if (e.key === 'ArrowDown') return (prev + 1) % allServers.length;
            return (prev - 1 + allServers.length) % allServers.length;
          });
        }
      }
      if (showServerPanel && e.key === 'Enter') {
        setLoading(true);
        setLoadError(false);
        setShowServerPanel(false);
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        showControls();
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [handleClose, showServerPanel]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (showServerPanel) {
        const panel = document.querySelector('.player-server-panel');
        if (panel && !panel.contains(e.target)) {
          setShowServerPanel(false);
        }
      }
    }
    if (showServerPanel) {
      setControlsVisible(true);
      clearTimeout(hideTimerRef.current);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showServerPanel]);

  useEffect(() => {
    if (!isTV || !tmdbId) return;
    let cancelled = false;
    async function loadEpisodes() {
      setEpisodesLoading(true);
      try {
        const data = await getTVSeason(tmdbId, episodesSeason);
        if (!cancelled) setEpisodes(data.episodes || []);
      } catch (err) {
        console.error('Failed to load episodes:', err);
        if (!cancelled) setEpisodes([]);
      } finally {
        if (!cancelled) setEpisodesLoading(false);
      }
    }
    loadEpisodes();
    return () => { cancelled = true; };
  }, [tmdbId, episodesSeason, isTV]);

  useEffect(() => {
    if (season) setEpisodesSeason(season);
  }, [season]);

  useEffect(() => {
    if (isTV && season && episode) {
      setLoading(true);
      setLoadError(false);
      setFallbackCountdown(null);
      clearTimeout(fallbackTimerRef.current);
    }
  }, [season, episode, isTV]);

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
            switchServer((activeServer + 1) % allServers.length);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setFallbackCountdown(null);
      clearInterval(fallbackTimerRef.current);
    }
    return () => {
      clearInterval(fallbackTimerRef.current);
    };
  }, [loadError]);

  if (!imdbId && !tmdbId) return null;

  const current = allServers[activeServer];
  const embedUrl = getEmbedUrl(current, imdbId, mediaType, season, episode, tmdbId);

  function switchServer(index) {
    setActiveServer(index);
    setLoading(true);
    setLoadError(false);
    setFallbackCountdown(null);
    clearTimeout(loadTimerRef.current);
    clearInterval(fallbackTimerRef.current);
    setShowServerPanel(false);
    showControls();
  }

  function toggleFullscreen() {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  return (
    <div className="player-modal-overlay" ref={playerRef}>
      <div className="player-modal-inner">
        <div className="player-modal-header">
          <button className="player-modal-close" onClick={handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="player-modal-title">
            {title || 'Now Playing'}
            {isTV && <span className="player-modal-episode">S{season}E{episode}</span>}
          </div>
          <div className="player-modal-header-right">
            {isTV && (
              <button
                className="player-modal-nav-btn"
                onClick={handlePrevEpisode}
                disabled={!canGoPrev}
                aria-label="Previous episode"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
                </svg>
              </button>
            )}
            {isTV && (
              <button
                className="player-modal-nav-btn"
                onClick={handleNextEpisode}
                disabled={!canGoNext}
                aria-label="Next episode"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </button>
            )}
            <button className="player-modal-close player-modal-close-desktop" onClick={handleClose} aria-label="Close player">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="player-viewport"
          ref={viewportRef}
          onMouseMove={handlePlayerMouseMove}
          onTouchStart={handlePlayerTouchStart}
        >
          <div
            className={`player-full-overlay ${controlsVisible ? 'controls-up' : 'controls-down'}`}
            onTouchStart={handleFullOverlayTap}
            onClick={handleFullOverlayTap}
          />

          {showServerPanel && (
            <div className="player-server-panel">
              <div className="player-server-panel-header">
                <span className="player-server-panel-drag-handle" />
                Select Server
              </div>
              <div className="player-server-list">
                {allServers.map((s, i) => (
                  <button
                    key={s.id}
                    className={`player-server-item ${i === activeServer ? 'active' : ''}`}
                    onClick={() => switchServer(i)}
                  >
                    <span className={`player-server-status ${health[s.id] ? 'online' : health[s.id] === false ? 'offline' : ''}`} />
                    <span className="player-server-item-name">{s.name}</span>
                    <span className={`player-server-badge ${s.label === 'HD' ? 'hd' : s.label === 'VIP' ? 'vip' : ''}`}>
                      {s.label}
                    </span>
                    {i === activeServer && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="player-loading">
              <div className="player-loading-spinner" />
              <span>Loading from {current.name}...</span>
            </div>
          )}

          <iframe
            key={`${activeServer}-${tmdbId}-${season}-${episode}`}
            src={embedUrl}
            title={title || 'Player'}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="origin"
            className="player-iframe"
            onLoad={() => { setLoading(false); setLoadError(false); setFallbackCountdown(null); clearInterval(fallbackTimerRef.current); clearTimeout(loadTimerRef.current); }}
            onError={() => { setLoading(false); setLoadError(true); }}
          />

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
                  switchServer((activeServer + 1) % allServers.length);
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

        <div className="player-modal-info">
          {isTV && validSeasons.length > 0 && (
            <div className="player-controls-row">
              <div className="player-season-episode">
                <select
                  className="player-control-select"
                  value={episodesSeason}
                  onChange={(e) => {
                    const newSeason = Number(e.target.value);
                    setEpisodesSeason(newSeason);
                    if (onEpisodeChange) onEpisodeChange(newSeason, 1);
                  }}
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
                  onChange={(e) => {
                    const newEpisode = Number(e.target.value);
                    if (onEpisodeChange) onEpisodeChange(episodesSeason, newEpisode);
                  }}
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
            </div>
          )}

          <div className="player-server-row">
            <span className="player-server-row-label">Servers</span>
            <div className="player-server-grid">
              {allServers.map((s, i) => (
                <button
                  key={s.id}
                  className={`player-server-chip ${i === activeServer ? 'active' : ''} ${health[s.id] === false ? 'offline' : ''}`}
                  onClick={() => switchServer(i)}
                >
                  <span className={`player-server-status ${health[s.id] ? 'online' : health[s.id] === false ? 'offline' : ''}`} />
                  <span className="player-server-chip-name">{s.name}</span>
                  {s.label && (
                    <span className={`player-server-chip-badge ${s.label === 'HD' ? 'hd' : s.label === 'VIP' ? 'vip' : ''}`}>
                      {s.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
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
            <button
              className="player-action-pill"
              onClick={handleClose}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>

          {showWatchParty && (
            <WatchParty
              tmdbId={tmdbId}
              mediaType={mediaType}
              season={season}
              episode={episode}
              activeServer={activeServer}
              onSync={(s, e, server) => { switchServer(server); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
