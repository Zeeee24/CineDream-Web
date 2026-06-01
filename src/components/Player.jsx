import { useState, useEffect, useRef, useCallback } from 'react';
import { getServers, getEmbedUrl, checkAllServers } from '../services/servers';

const allServers = getServers();

export default function Player({ imdbId, tmdbId, mediaType, season, episode, title, onClose }) {
  const [activeServer, setActiveServer] = useState(0);
  const [health, setHealth] = useState({});
  const [showServerPanel, setShowServerPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const overlayRef = useRef(null);

  useEffect(() => {
    checkAllServers().then(setHealth);
    document.body.style.overflow = 'hidden';
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (showServerPanel) setShowServerPanel(false);
        else onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, showServerPanel]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

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
    <div ref={overlayRef} className="player-overlay" onClick={handleOverlayClick}>
      <div className="player-container">
        <div className="player-topbar">
          <button className="player-topbar-btn" onClick={onClose} aria-label="Close">
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
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
