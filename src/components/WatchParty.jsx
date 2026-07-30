import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, set, get, onValue, push, remove } from 'firebase/database';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function WatchParty({ roomCode: initialRoomCode, tmdbId, mediaType, season, episode, activeServer, onSync, onServerChange, onTimestampSync }) {
  const { user, userProfile, isLoggedIn } = useAuth();
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [members, setMembers] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [hostName, setHostName] = useState('');
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [joining, setJoining] = useState(false);
  const chatEndRef = useRef(null);
  const roomRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const joinedRef = useRef(false);

  const leaveRoom = useCallback(() => {
    if (roomCode && user) {
      const memRef = ref(db, `watchParties/${roomCode}/members/${user.uid}`);
      remove(memRef).catch(() => {});
    }
    setRoomCode('');
    setMembers({});
    setIsHost(false);
    setChatMessages([]);
    roomRef.current = null;
    joinedRef.current = false;
    clearInterval(syncIntervalRef.current);
  }, [roomCode, user]);

  useEffect(() => {
    if (!initialRoomCode || !isLoggedIn || !user) return;

    async function joinExistingRoom() {
      const r = ref(db, `watchParties/${initialRoomCode}`);
      const snap = await get(r);
      if (!snap.exists()) return;
      const data = snap.val();

      if (data.password) {
        setPasswordPrompt(true);
        return;
      }

      const memberCount = Object.keys(data.members || {}).length;
      if (memberCount >= 8) return;

      await set(ref(db, `watchParties/${initialRoomCode}/members/${user.uid}`), {
        displayName: userProfile?.displayName || 'Member',
        photoURL: userProfile?.photoURL || '',
        role: 'member',
      });

      setRoomCode(initialRoomCode);
      setIsHost(false);
      joinedRef.current = true;

      if (data.activeServer !== undefined && onServerChange) {
        onServerChange(data.activeServer);
      }
    }

    joinExistingRoom();
  }, [initialRoomCode, isLoggedIn, user, userProfile, onServerChange]);

  async function joinWithPassword() {
    if (!passwordInput.trim()) return;
    setJoining(true);
    setPasswordError('');
    try {
      const r = ref(db, `watchParties/${initialRoomCode}`);
      const snap = await get(r);
      if (!snap.exists()) { setPasswordError('Room not found'); return; }
      const data = snap.val();
      if (data.password !== passwordInput.trim()) { setPasswordError('Incorrect password'); return; }

      const memberCount = Object.keys(data.members || {}).length;
      if (memberCount >= 8) { setPasswordError('Room is full'); return; }

      await set(ref(db, `watchParties/${initialRoomCode}/members/${user.uid}`), {
        displayName: userProfile?.displayName || 'Member',
        photoURL: userProfile?.photoURL || '',
        role: 'member',
      });

      setRoomCode(initialRoomCode);
      setIsHost(false);
      setPasswordPrompt(false);
      joinedRef.current = true;

      if (data.activeServer !== undefined && onServerChange) {
        onServerChange(data.activeServer);
      }
    } catch {
      setPasswordError('Failed to join room');
    } finally {
      setJoining(false);
    }
  }

  useEffect(() => {
    if (!roomCode || !user) return;
    const r = ref(db, `watchParties/${roomCode}`);
    roomRef.current = r;

    const unsub = onValue(r, (snap) => {
      if (!snap.exists()) {
        leaveRoom();
        return;
      }
      const data = snap.val();
      setMembers(data.members || {});
      setHostName(data.hostName || '');

      if (user.uid !== data.host && data.activeServer !== undefined && onServerChange) {
        onServerChange(data.activeServer);
      }

      if (data.syncEvent && onSync) {
        const { syncSeason, syncEpisode, syncServer } = data.syncEvent;
        onSync(syncSeason, syncEpisode, syncServer);
      }

      if (user.uid !== data.host && data.hostTimestamp !== undefined && joinedRef.current && onTimestampSync) {
        onTimestampSync(data.hostTimestamp);
        joinedRef.current = false;
      }
    });

    return () => { unsub(); };
  }, [roomCode, user, onSync, onServerChange, onTimestampSync, leaveRoom]);

  useEffect(() => {
    if (!roomCode) return;
    const chatRef = ref(db, `watchParties/${roomCode}/chat`);
    const unsub = onValue(chatRef, (snap) => {
      if (!snap.exists()) { setChatMessages([]); return; }
      const data = snap.val();
      const msgs = Object.values(data).sort((a, b) => a.ts - b.ts);
      setChatMessages(msgs);
    });
    return () => unsub();
  }, [roomCode]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isHost && roomCode) {
      syncIntervalRef.current = setInterval(() => {
        set(ref(db, `watchParties/${roomCode}/hostTimestamp`), Date.now());
      }, 5000);
    }
    return () => clearInterval(syncIntervalRef.current);
  }, [isHost, roomCode]);

  async function handleSync() {
    if (!roomCode || !isHost) return;
    await set(ref(db, `watchParties/${roomCode}/syncEvent`), {
      syncSeason: season,
      syncEpisode: episode,
      syncServer: activeServer,
      ts: Date.now(),
    });
    if (onSync) onSync(season, episode, activeServer);
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim() || !roomCode || !user) return;
    await push(ref(db, `watchParties/${roomCode}/chat`), {
      uid: user.uid,
      name: userProfile?.displayName || 'Anonymous',
      text: chatInput.trim(),
      ts: Date.now(),
    });
    setChatInput('');
  }

  if (!isLoggedIn) {
    return (
      <div className="wp-login-prompt">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
        <span>Sign in to join the Watch Party</span>
      </div>
    );
  }

  if (passwordPrompt) {
    return (
      <div className="wp-password-prompt">
        <p>This room is private</p>
        <div className="wp-password-row">
          <input
            className="wp-chat-input"
            type="password"
            placeholder="Enter password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') joinWithPassword(); }}
          />
          <button className="wp-btn wp-btn-send" onClick={joinWithPassword} disabled={joining || !passwordInput.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {passwordError && <p className="wp-error">{passwordError}</p>}
      </div>
    );
  }

  if (!roomCode) return null;

  const memberCount = Object.keys(members).length;

  return (
    <div className="wp-embedded">
      <div className="wp-header">
        <div className="wp-room-info">
          <span className="wp-badge">{isHost ? 'Host' : 'Member'}</span>
          <span className="wp-code-label">Room: <strong>{roomCode}</strong></span>
          <span className="wp-member-count">
            <span className="wp-online-dot" />
            {memberCount}
          </span>
        </div>
        <div className="wp-header-actions">
          {isHost && (
            <button className="wp-btn wp-btn-sync" onClick={handleSync} title="Sync all members">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
          )}
          <button
            className="wp-btn wp-btn-copy"
            onClick={() => { navigator.clipboard?.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            title="Copy room code"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
          <button className="wp-btn wp-btn-leave" onClick={leaveRoom} title="Leave room">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="wp-members">
        {Object.entries(members).map(([uid, m]) => (
          <div key={uid} className="wp-member">
            {m.photoURL ? (
              <img src={m.photoURL} alt="" className="wp-member-avatar" />
            ) : (
              <span className="wp-member-avatar wp-member-initials">
                {(m.displayName || '?').charAt(0).toUpperCase()}
              </span>
            )}
            {m.role === 'host' && <span className="wp-host-badge">H</span>}
          </div>
        ))}
      </div>

      <div className="wp-chat">
        <div className="wp-chat-messages">
          {chatMessages.length === 0 && (
            <p className="wp-chat-empty">No messages yet. Say hello!</p>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`wp-chat-msg ${msg.uid === user?.uid ? 'own' : ''}`}>
              {msg.uid !== user?.uid && <span className="wp-chat-name">{msg.name}</span>}
              <span className="wp-chat-text">{msg.text}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form className="wp-chat-form" onSubmit={sendChat}>
          <input
            className="wp-chat-input"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={200}
          />
          <button className="wp-btn wp-btn-send" type="submit" disabled={!chatInput.trim()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
