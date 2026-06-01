import { useState, useEffect, useCallback } from 'react';
import { getServers, getEmbedUrl, checkAllServers } from '../services/servers';
import { addToHistory } from '../services/watchHistory';

const allServers = getServers();

export default function Player({ imdbId, tmdbId, mediaType, season, episode, title, posterPath, backdropPath, onClose }) {
  const [activeServer, setActiveServer] = useState(0);
  const [health, setHealth] = useState({});
  const [showServerPanel, setShowServerPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleClose = useCallback(() => {
    try {
      addToHistory({
        tmdbId: Number(tmdbId),
        title: title || 'Untitled',
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        contentType: mediaType === 'tv' ? 'TV' : 'Movie',
        season: season || null,
        episode: episode || null,
        progressSeconds: 1,
        durationSeconds: 3600,
      });
    } catch (e) {
      console.warn('Failed to save history:', e);
    }
    onClose();
  }, [tmdbId, title, posterPath, backdropPath, mediaType, season, episode, onClose]);

  useEffect(() => {
    checkAllServers().then((h) => {
      setHealth(h);
      if (h[allServers[0].id] === false) {
        const firstOnline = allServers.findIndex((s) => h[s.id] !== false);
        if (firstOnline > 0) setActiveServer(firstOnline);
      }
    });
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    function handleKey(e) {
      if (e.key === 'Escape') {
        if (showServerPanel) setShowServerPanel(false);
        else handleClose();
        return;
      }
      if (showServerPanel && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        setActiveServer((prev) => {
          if (e.key === 'ArrowDown') return (prev + 1) % allServers.length;
          return (prev - 1 + allServers.length) % allServers.length;
        });
      }
      if (showServerPanel && e.key === 'Enter') {
        setIframeKey((k) => k + 1);
        setLoading(true);
        setLoadError(false);
        setShowServerPanel(false);
      }
    }

    window.history.pushState({ playerOpen: true }, '');
    function handlePopState() {
      if (showServerPanel) setShowServerPanel(false);
      else handleClose();
    }

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('keydown', handleKey);
    };
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
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showServerPanel]);

  if (!imdbId && !tmdbId) return null;

  const current = allServers[activeServer];
  const embedUrl = getEmbedUrl(current, imdbId, mediaType, season, episode, tmdbId);

  function switchServer(index) {
    setActiveServer(index);
    setIframeKey((k) => k + 1);
    setLoading(true);
    setLoadError(false);
    setShowServerPanel(false);
  }

  return (
    <div className="player-overlay">
      <div className="player-container">
        <div className="player-topbar">
          <button className="player-topbar-btn" onClick={handleClose} aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="player-topbar-title">
            {title || 'Now Playing'}
            {mediaType === 'tv' && <span className="player-topbar-episode"> S{season} E{episode}</span>}
          </div>
          <button
            className={`player-topbar-btn server-toggle ${showServerPanel ? 'active' : ''}`}
            onClick={() => setShowServerPanel(!showServerPanel)}
            aria-label="Servers"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <span className="server-toggle-label">Servers</span>
          </button>
        </div>

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
          key={iframeKey}
          src={embedUrl}
          title={title || 'Player'}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; media"
          referrerPolicy="origin"
          className="player-iframe"
          onLoad={() => { setLoading(false); setLoadError(false); }}
          onError={() => { setLoading(false); setLoadError(true); }}
        />

        {loadError && (
          <div className="player-error">
            <p>Failed to load from {current.name}</p>
            <button className="btn btn-primary" onClick={() => switchServer((activeServer + 1) % allServers.length)}>
              Try Next Server
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
