import { useState, useEffect, useRef } from 'react';
import { getServers, getEmbedUrl, checkAllServers } from '../services/servers';

const allServers = getServers();

export default function Player({ imdbId, mediaType, season, episode, onClose }) {
  const [activeServer, setActiveServer] = useState(0);
  const [health, setHealth] = useState({});
  const [showServerPanel, setShowServerPanel] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    checkAllServers().then(setHealth);

    document.body.style.overflow = 'hidden';
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  if (!imdbId) return null;

  const current = allServers[activeServer];
  const embedUrl = getEmbedUrl(current, imdbId, mediaType, season, episode);

  return (
    <div
      ref={overlayRef}
      className="player-overlay"
      onClick={handleOverlayClick}
    >
      <div className="player-container">
        <button className="player-close" onClick={onClose} aria-label="Close player">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        <button
          className="player-server-btn"
          onClick={() => setShowServerPanel(!showServerPanel)}
          aria-label="Switch server"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z" />
          </svg>
          Servers
        </button>

        {showServerPanel && (
          <div className="server-panel">
            <div className="server-panel-header">
              <h3>Select Server</h3>
              <button onClick={() => setShowServerPanel(false)} aria-label="Close panel">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <div className="server-list">
              {allServers.map((s, i) => (
                <button
                  key={s.id}
                  className={`server-item ${i === activeServer ? 'active' : ''}`}
                  onClick={() => {
                    setActiveServer(i);
                    setShowServerPanel(false);
                  }}
                >
                  <span className={`server-dot ${health[s.id] ? 'alive' : health[s.id] === false ? 'dead' : 'unknown'}`} />
                  <span className="server-name">{s.name}</span>
                  {i === activeServer && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <iframe
          key={`${current.id}-${imdbId}`}
          src={embedUrl}
          title={`Player - ${current.name}`}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
          className="player-iframe"
        />
      </div>
    </div>
  );
}
