import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getTVSeason, img } from '../services/tmdb';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function CreateRoomModal({ isOpen, onClose, tmdbId, mediaType, title, posterPath, seasons }) {
  const navigate = useNavigate();
  const { user, userProfile, isLoggedIn } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const overlayRef = useRef(null);
  const isTV = mediaType === 'tv';
  const validSeasons = (seasons || []).filter((s) => s.season_number > 0);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedSeason(1);
      setSelectedEpisode(1);
      setIsPrivate(false);
      setPassword('');
      setCreating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isTV || !tmdbId || !isOpen) return;
    let cancelled = false;
    setEpisodesLoading(true);
    getTVSeason(tmdbId, selectedSeason)
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
  }, [tmdbId, selectedSeason, isTV, isOpen]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleCreate() {
    if (!isLoggedIn || !user) return;
    setCreating(true);
    try {
      const code = generateCode();
      const roomData = {
        host: user.uid,
        hostName: userProfile?.displayName || userProfile?.email || 'Host',
        title: title || '',
        posterPath: posterPath || null,
        tmdbId,
        mediaType,
        season: isTV ? selectedSeason : null,
        episode: isTV ? selectedEpisode : null,
        activeServer: 0,
        hostTimestamp: Date.now(),
        createdAt: Date.now(),
        password: isPrivate ? password : null,
        members: {
          [user.uid]: {
            displayName: userProfile?.displayName || 'Host',
            photoURL: userProfile?.photoURL || '',
            role: 'host',
          },
        },
      };
      await set(ref(db, `watchParties/${code}`), roomData);
      if (isPrivate && password) {
        sessionStorage.setItem('wp_auth_' + code, password);
      }
      const params = new URLSearchParams();
      params.set('room', code);
      if (isTV) {
        params.set('s', String(selectedSeason));
        params.set('e', String(selectedEpisode));
      }
      onClose();
      navigate(`/watch/${mediaType}/${tmdbId}?${params.toString()}`);
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setCreating(false);
    }
  }

  const posterUrl = posterPath ? img.poster(posterPath, 'w342') : null;

  return (
    <div ref={overlayRef} className="auth-modal-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="auth-modal-title">Create Watch Party</h2>

        {step === 1 && (
          <div className="cr-step">
            <div className="cr-content-preview">
              {posterUrl && <img src={posterUrl} alt={title} className="cr-poster" />}
              <div className="cr-content-info">
                <span className="cr-content-type">{isTV ? 'TV Series' : 'Movie'}</span>
                <span className="cr-content-title">{title}</span>
              </div>
            </div>
            <button className="auth-btn-submit" onClick={() => setStep(isTV ? 2 : 3)}>
              Next
            </button>
          </div>
        )}

        {step === 2 && isTV && (
          <div className="cr-step">
            <label className="cr-label">Season</label>
            <select
              className="cr-select"
              value={selectedSeason}
              onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}
            >
              {validSeasons.map((s) => (
                <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
              ))}
            </select>

            <label className="cr-label">Episode</label>
            <select
              className="cr-select"
              value={selectedEpisode}
              onChange={(e) => setSelectedEpisode(Number(e.target.value))}
            >
              {episodesLoading ? (
                <option value={selectedEpisode}>Loading...</option>
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

            <div className="cr-nav">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="auth-btn-submit" onClick={() => setStep(3)}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="cr-step">
            <div className="cr-toggle-row">
              <span className="cr-label">Private Room</span>
              <button
                className={`cr-toggle ${isPrivate ? 'active' : ''}`}
                onClick={() => { setIsPrivate(!isPrivate); setPassword(''); }}
                role="switch"
                aria-checked={isPrivate}
              >
                <span className="cr-toggle-thumb" />
              </button>
            </div>

            {isPrivate && (
              <input
                className="cr-input"
                type="text"
                placeholder="Room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={20}
              />
            )}

            <div className="cr-nav">
              <button className="btn btn-secondary" onClick={() => setStep(isTV ? 2 : 1)}>Back</button>
              <button
                className="auth-btn-submit"
                onClick={handleCreate}
                disabled={creating || !isLoggedIn || (isPrivate && !password.trim())}
              >
                {creating ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
