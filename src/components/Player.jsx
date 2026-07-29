import { useState, useEffect, useCallback, useRef } from 'react';
import { getServers, getEmbedUrl, checkAllServers } from '../services/servers';
import { getTVSeason, img } from '../services/tmdb';
import { addToHistory } from '../services/watchHistory';

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
  const playerRef = useRef(null);
  const viewportRef = useRef(null);
  const hideTimerRef = useRef(null);
  const loadTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  const isTV = mediaType === 'tv';
  const validSeasons = (seasons && seasons.length > 0) 
    ? seasons.filter((s) => s.season_number > 0)
    : [];


  const handleClose = useCallback(() => {
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
    console.log('goToEpisode called with:', newSeason, newEpisode);
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
      if (!showServerPanel) setControlsVisible(false);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (showServerPanel) setShowServerPanel(false);
        else handleClose();
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

    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [handleClose, showServerPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e) {
      if (e.target.closest('.player-topbar-btn')) return;
      if (showServerPanel) {
        const panel = document.querySelector('.player-server-panel');
        if (panel && !panel.contains(e.target)) {
          setShowServerPanel(false);
        }
      }
    }
    if (showServerPanel) {
      setControlsVisible(true); // eslint-disable-line react-hooks/set-state-in-effect
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
    if (season) setEpisodesSeason(season); // eslint-disable-line react-hooks/set-state-in-effect
  }, [season]);

  useEffect(() => {
    if (isTV && season && episode) {
      setLoading(true);
      setLoadError(false);
      setFallbackCountdown(null);
      clearTimeout(fallbackTimerRef.current);
    }
  }, [season, episode, isTV]);

  // Load timeout: if loading persists >15s, treat as failure
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

  // Auto-fallback: when loadError is true, countdown 5s then switch server
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
  }, [loadError]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div
      className="player-section"
      ref={playerRef}
      onMouseMove={handlePlayerMouseMove}
    >
      <div
        className="player-viewport"
        ref={viewportRef}
        onTouchStart={handlePlayerTouchStart}
      >
        <div className={`player-topbar ${controlsVisible ? 'visible' : 'hidden'}`}>
          <button className="player-topbar-btn" onClick={onClose} aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="player-topbar-title">
            {title || 'Now Playing'}
            {isTV && <span className="player-topbar-episode"> S{season}E{episode}</span>}
          </div>
          {isTV && (
            <button
              className="player-topbar-btn"
              onClick={handlePrevEpisode}
              disabled={!canGoPrev}
              aria-label="Previous episode"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>
          )}
          {isTV && (
            <button
              className="player-topbar-btn"
              onClick={handleNextEpisode}
              disabled={!canGoNext}
              aria-label="Next episode"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          )}
          <div style={{ flex: 1 }} />
        </div>

        <div
          className={`player-full-overlay ${controlsVisible ? 'controls-up' : 'controls-down'}`}
          onTouchStart={handleFullOverlayTap}
          onClick={handleFullOverlayTap}
        />

        {showServerPanel && (
          <div className="player-server-panel">
            <div className="player-server-panel-header">Select Server</div>
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

      {/* Under-player control bar */}
      <div className="player-controls-bar">
        <div className="player-controls-left">
          {isTV && validSeasons.length > 0 && (
            <>
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
            </>
          )}
        </div>
        <div className="player-controls-right">
          <button
            className="player-control-btn server-toggle"
            onClick={() => { setShowServerPanel(!showServerPanel); }}
            aria-label="Servers"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <span>Servers</span>
            <span className="player-control-server-badge">{current?.name?.split(' — ')[1] || current?.name || 'S1'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
