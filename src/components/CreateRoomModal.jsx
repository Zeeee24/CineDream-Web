import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { searchMulti, getTVDetails, img } from '../services/tmdb';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function CreateRoomModal({ isOpen, onClose, tmdbId, mediaType, title, posterPath, seasons }) {
  const navigate = useNavigate();
  const { user, userProfile, isLoggedIn } = useAuth();
  const hasInitialContent = !!tmdbId;

  const [step, setStep] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState(
    hasInitialContent ? { id: tmdbId, media_type: mediaType, title, poster_path: posterPath, seasons } : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const searchInputRef = useRef(null);

  const isTV = hasInitialContent
    ? mediaType === 'tv'
    : selectedMedia?.media_type === 'tv';
  const activeSeasons = hasInitialContent ? (seasons || []) : (selectedMedia?.seasons || []);
  const validSeasons = activeSeasons.filter((s) => s.season_number > 0);
  const activeTmdbId = hasInitialContent ? tmdbId : selectedMedia?.id;
  const activeTitle = hasInitialContent ? title : selectedMedia?.title || selectedMedia?.name || '';
  const activePosterPath = hasInitialContent ? posterPath : selectedMedia?.poster_path;
  const activeMediaType = hasInitialContent ? mediaType : selectedMedia?.media_type;

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedMedia(hasInitialContent ? { id: tmdbId, media_type: mediaType, title, poster_path: posterPath, seasons } : null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedSeason(1);
      setSelectedEpisode(1);
      setIsPrivate(false);
      setPassword('');
      setCreating(false);
    }
  }, [isOpen, hasInitialContent, tmdbId, mediaType, title, posterPath, seasons]);

  useEffect(() => {
    if (!isTV || !activeTmdbId || !isOpen) return;
    let cancelled = false;
    setEpisodesLoading(true);
    const apiKey = import.meta.env.VITE_TMDB_API_KEY || 'b67e640f1b90b799a41e12416a891ed9';
    fetch(`https://api.themoviedb.org/3/tv/${activeTmdbId}/season/${selectedSeason}?api_key=${apiKey}&language=en-US`)
      .then((res) => res.json())
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
  }, [activeTmdbId, selectedSeason, isTV, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!hasInitialContent && isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, hasInitialContent]);

  const doSearch = useCallback(
    debounce(async (q, setResults, setLoading) => {
      if (!q.trim()) { setResults([]); setLoading(false); return; }
      setLoading(true);
      try {
        const data = await searchMulti(q);
        const items = (data.results || []).filter(
          (r) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path
        );
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setSearchLoading(true);
      doSearch(val, setSearchResults, setSearchLoading);
    } else {
      setSearchResults([]);
    }
  }

  async function handleSelectMedia(item) {
    setSelectedMedia(item);
    setSearchResults([]);
    setSearchQuery('');
    if (item.media_type === 'tv') {
      setMediaLoading(true);
      try {
        const details = await getTVDetails(item.id);
        setSelectedMedia((prev) => ({ ...prev, seasons: details.seasons || [] }));
      } catch {
        setSelectedMedia((prev) => ({ ...prev, seasons: [] }));
      } finally {
        setMediaLoading(false);
      }
      setStep(2);
    } else {
      setStep(3);
    }
  }

  async function handleCreate() {
    if (!isLoggedIn || !user) return;
    setCreating(true);
    try {
      const code = generateCode();
      const roomData = {
        host: user.uid,
        hostName: userProfile?.displayName || userProfile?.email || 'Host',
        title: activeTitle,
        posterPath: activePosterPath || null,
        tmdbId: activeTmdbId,
        mediaType: activeMediaType,
        season: isTV ? selectedSeason : null,
        episode: isTV ? selectedEpisode : null,
        activeServer: 2,
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
      navigate(`/watch/${activeMediaType}/${activeTmdbId}?${params.toString()}`);
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setCreating(false);
    }
  }

  if (!isOpen) return null;

  const posterUrl = activePosterPath ? img.poster(activePosterPath, 'w342') : null;

  function getStepLabel() {
    if (hasInitialContent) return isTV ? 'Season & Episode' : 'Privacy';
    if (step === 1) return 'Choose Content';
    if (step === 2) return 'Season & Episode';
    return 'Privacy';
  }

  return (
    <div
      className="fixed inset-0 z-[99999] pointer-events-auto bg-zinc-950 sm:bg-black/80 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="relative w-full h-full sm:h-auto sm:max-w-md bg-zinc-950 sm:bg-zinc-900 sm:rounded-2xl p-4 sm:p-6 sm:shadow-2xl sm:border sm:border-zinc-800 pointer-events-auto overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pt-2 sm:pt-0">
          <h2 className="text-2xl sm:text-xl font-bold text-white">Create Watch Party</h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-3 sm:p-2 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-full cursor-pointer z-[100000]"
          >
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <span className="text-sm text-zinc-400 mb-4 block">{getStepLabel()}</span>

        {!hasInitialContent && step === 1 && (
          <div className="cr-step">
            <div className="cr-search-wrapper">
              <svg className="cr-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                ref={searchInputRef}
                className="cr-search-input"
                type="text"
                placeholder="Search movies and TV shows..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }}
              />
              {searchQuery && (
                <button className="cr-search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              )}
            </div>

            {searchLoading && (
              <div className="cr-search-loading">
                <div className="player-loading-spinner" style={{ width: 20, height: 20 }} />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="cr-search-results">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    className="cr-search-result"
                    onClick={() => handleSelectMedia(item)}
                    type="button"
                  >
                    {item.poster_path ? (
                      <img src={img.poster(item.poster_path, 'w92')} alt="" className="cr-search-poster" />
                    ) : (
                      <div className="cr-search-poster cr-search-poster-placeholder" />
                    )}
                    <div className="cr-search-info">
                      <span className="cr-search-title">{item.title || item.name}</span>
                      <span className="cr-search-meta">
                        {item.media_type === 'tv' ? 'TV Series' : 'Movie'}
                        {(item.release_date || item.first_air_date) && (
                          <> &middot; {(item.release_date || item.first_air_date).slice(0, 4)}</>
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div className="cr-search-empty">No results found</div>
            )}
          </div>
        )}

        {step === 1 && hasInitialContent && (
          <div className="cr-step">
            <div className="cr-content-preview">
              {posterUrl && <img src={posterUrl} alt={activeTitle} className="cr-poster" />}
              <div className="cr-content-info">
                <span className="cr-content-type">{isTV ? 'TV Series' : 'Movie'}</span>
                <span className="cr-content-title">{activeTitle}</span>
              </div>
            </div>
            <button className="auth-btn-submit" onClick={() => setStep(isTV ? 2 : 3)}>
              Next
            </button>
          </div>
        )}

        {step === 2 && isTV && (
          <div className="cr-step">
            {mediaLoading ? (
              <div className="cr-search-loading">
                <div className="player-loading-spinner" style={{ width: 24, height: 24 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading episodes...</span>
              </div>
            ) : (
              <>
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
              </>
            )}

            <div className="cr-nav">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="auth-btn-submit" onClick={() => setStep(3)} disabled={mediaLoading || validSeasons.length === 0}>Next</button>
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
              <button className="btn btn-secondary" onClick={() => setStep(isTV ? 2 : hasInitialContent ? 1 : 1)}>Back</button>
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
