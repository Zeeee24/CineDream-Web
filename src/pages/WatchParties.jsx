import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, remove } from 'firebase/database';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { img } from '../services/tmdb';
import CreateRoomModal from '../components/CreateRoomModal';

export default function WatchParties() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      setLoading(true);
      try {
        const snap = await get(ref(db, 'watchParties'));
        if (cancelled) return;
        if (!snap.exists()) {
          setRooms([]);
          return;
        }
        const data = snap.val();
        const now = Date.now();
        const active = [];
        const staleCodes = [];

        Object.entries(data).forEach(([code, room]) => {
          const now2 = Date.now();
          const activeMembers = Object.entries(room.members || {}).filter(([, m]) => {
            return m.lastSeen && (now2 - m.lastSeen) < 10000;
          });
          const memberCount = activeMembers.length;
          const age = now - (room.createdAt || 0);
          if (memberCount === 0) {
            staleCodes.push(code);
          } else if (age < 86400000) {
            active.push({
              code,
              title: room.title || 'Untitled',
              posterPath: room.posterPath || null,
              mediaType: room.mediaType || 'movie',
              tmdbId: room.tmdbId,
              hostName: room.hostName || 'Unknown',
              memberCount,
              hasPassword: !!room.password,
              createdAt: room.createdAt || 0,
            });
          } else {
            staleCodes.push(code);
          }
        });

        staleCodes.forEach((code) => {
          remove(ref(db, `watchParties/${code}`)).catch(() => {});
        });

        active.sort((a, b) => b.createdAt - a.createdAt);
        setRooms(active);
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRooms();
    return () => { cancelled = true; };
  }, []);

  async function handleJoinCode(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setJoinError('');
    try {
      const snap = await get(ref(db, `watchParties/${code}`));
      if (!snap.exists()) {
        setJoinError('Room not found');
        return;
      }
      const room = snap.val();
      const activeMembers = Object.entries(room.members || {}).filter(([, m]) => {
        return m.lastSeen && (Date.now() - m.lastSeen) < 10000;
      });
      if (activeMembers.length === 0) {
        setJoinError('Room is empty');
        return;
      }
      if (room.password) {
        sessionStorage.setItem('wp_auth_' + code, room.password);
      }
      navigate(`/watch/${room.mediaType}/${room.tmdbId}?room=${code}`);
    } catch {
      setJoinError('Failed to find room');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="wp-lobby-page">
      <div className="wp-lobby-header">
        <h1 className="wp-lobby-title">Watch Parties</h1>
        <div className="wp-lobby-actions">
          <form className="wp-join-form" onSubmit={handleJoinCode}>
            <input
              className="wp-join-input"
              type="text"
              placeholder="Enter room code"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              maxLength={6}
              disabled={joining}
            />
            <button
              className="btn btn-secondary wp-join-btn"
              type="submit"
              disabled={joining || !joinCode.trim()}
            >
              {joining ? '...' : 'Join'}
            </button>
          </form>
          {joinError && <span className="wp-join-error">{joinError}</span>}
          {isLoggedIn && (
            <button className="btn btn-primary wp-lobby-create" onClick={() => setCreateOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Room
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="wp-lobby-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="wp-lobby-card wp-lobby-card-skeleton">
              <div className="wp-lobby-poster skeleton" />
              <div className="wp-lobby-info">
                <div className="skeleton skeleton-text" style={{ width: '60%', height: 14 }} />
                <div className="skeleton skeleton-text" style={{ width: '40%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="empty-page">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <p>No active rooms</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Start a watch party and invite friends to watch together.
          </p>
          {isLoggedIn && (
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              Create a Room
            </button>
          )}
        </div>
      ) : (
        <div className="wp-lobby-grid">
          {rooms.map((room) => (
            <div
              key={room.code}
              className="wp-lobby-card"
              onClick={() => navigate(`/watch/${room.mediaType}/${room.tmdbId}?room=${room.code}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/watch/${room.mediaType}/${room.tmdbId}?room=${room.code}`);
                }
              }}
            >
              <div className="wp-lobby-poster">
                {room.posterPath ? (
                  <img src={img.poster(room.posterPath, 'w185')} alt={room.title} loading="lazy" />
                ) : (
                  <div className="wp-lobby-poster-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="wp-lobby-info">
                <div className="wp-lobby-title-text">{room.title}</div>
                <div className="wp-lobby-code">{room.code}</div>
                <div className="wp-lobby-meta">
                  <span className="wp-lobby-host">{room.hostName}</span>
                  <span className="wp-lobby-member-count">
                    <span className="wp-online-dot" />
                    {room.memberCount}
                  </span>
                  {room.hasPassword && (
                    <span className="wp-lobby-lock" title="Private room">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoggedIn && (
        <CreateRoomModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          tmdbId={null}
          mediaType="movie"
          title=""
          posterPath={null}
          seasons={[]}
        />
      )}
    </div>
  );
}
