import { useEffect, useRef } from 'react';
import { getYouTubeEmbedUrl } from '../services/youtube';

export default function TrailerModal({ videoKey, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  if (!videoKey) return null;

  return (
    <div
      ref={overlayRef}
      className="trailer-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
    >
      <div className="trailer-modal">
        <button className="trailer-close" onClick={onClose} aria-label="Close player">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        <iframe
          src={getYouTubeEmbedUrl(videoKey, { autoplay: 1, mute: 1, controls: 1 })}
          title="Trailer"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          referrerPolicy="no-referrer"
          className="trailer-iframe"
        />
      </div>
    </div>
  );
}
