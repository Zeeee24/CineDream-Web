import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, set, get, onValue, push, remove } from 'firebase/database';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function WatchParty({ tmdbId, mediaType, season, episode, activeServer, onSync, onServerChange, onTimestampSync }) {
  const { user, userProfile, isLoggedIn } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [members, setMembers] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [hostName, setHostName] = useState('');
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
    setShowPanel(false);
    roomRef.current = null;
    joinedRef.current = false;
    clearInterval(syncIntervalRef.current);
  }, [roomCode, user]);

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

      if (!isHost && data.activeServer !== undefined && onServerChange) {
        onServerChange(data.activeServer);
      }

      if (data.syncEvent && onSync) {
        const { syncSeason, syncEpisode, syncServer } = data.syncEvent;
        onSync(syncSeason, syncEpisode, syncServer);
      }

      if (!isHost && data.hostTimestamp !== undefined && joinedRef.current && onTimestampSync) {
        onTimestampSync(data.hostTimestamp);
        joinedRef.current = false;
      }
    });

    return () => {
      unsub();
    };
  }, [roomCode, user, onSync, isHost, onServerChange, onTimestampSync, leaveRoom]);

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

  async function createRoom() {
    if (!user || !isLoggedIn) return;
    const code = generateCode();
    const roomData = {
      host: user.uid,
      hostName: userProfile?.displayName || userProfile?.email || 'Host',
      tmdbId,
      mediaType,
      season: season || null,
      episode: episode || null,
      activeServer,
      hostTimestamp: Date.now(),
      createdAt: Date.now(),
      members: {
        [user.uid]: {
          displayName: userProfile?.displayName || 'Host',
          photoURL: userProfile?.photoURL || '',
          role: 'host',
        },
      },
    };
    await set(ref(db, `watchParties/${code}`), roomData);
    setRoomCode(code);
    setIsHost(true);
    setShowPanel(true);
  }

  async function joinRoom(code) {
    if (!user || !isLoggedIn || !code.trim()) return;
    const upperCode = code.trim().toUpperCase();
    const r = ref(db, `watchParties/${upperCode}`);
    const snap = await get(r);
    if (!snap.exists()) {
      alert('Room not found');
      return;
    }
    const data = snap.val();
    if (data.tmdbId !== tmdbId) {
      alert('Room is watching different content');
      return;
    }
    const memberCount = Object.keys(data.members || {}).length;
    if (memberCount >= 8) {
      alert('Room is full');
      return;
    }
    await set(ref(db, `watchParties/${upperCode}/members/${user.uid}`), {
      displayName: userProfile?.displayName || 'Member',
      photoURL: userProfile?.photoURL || '',
      role: 'member',
    });
    setRoomCode(upperCode);
    setIsHost(false);
    setShowPanel(true);
    joinedRef.current = true;

    if (data.activeServer !== undefined && onServerChange) {
      onServerChange(data.activeServer);
    }
  }

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

  async function handleServerChange(newServer) {
    if (!roomCode || !isHost) return;
    await set(ref(db, `watchParties/${roomCode}/activeServer`), newServer);
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

  const memberCount = Object.keys(members).length;
  const isWatching = !!roomCode;

  if (!isLoggedIn) {
    return (
      <div className="wp-container">
        <div className="wp-login-prompt">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          <span>Sign in to start a Watch Party</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wp-container">
      {!showPanel ? (
        <div className="wp-lobby">
          <button className="wp-btn wp-btn-create" onClick={createRoom}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Create Watch Party
          </button>
          <div className="wp-join-row">
            <input
              className="wp-join-input"
              placeholder="Enter room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button
              className="wp-btn wp-btn-join"
              onClick={() => joinRoom(joinCode)}
              disabled={!joinCode.trim()}
            >
              Join
            </button>
          </div>
        </div>
      ) : (
        <div className="wp-active">
          <div className="wp-header">
            <div className="wp-room-info">
              <span className="wp-badge">{isHost ? 'Host' : 'Member'}</span>
              <span className="wp-code-label">Room: <strong>{roomCode}</strong></span>
              <span className="wp-member-count">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="wp-header-actions">
              {isHost && (
                <button className="wp-btn wp-btn-sync" onClick={handleSync}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  Sync
                </button>
              )}
              <button
                className="wp-btn wp-btn-copy"
                onClick={() => { navigator.clipboard?.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button className="wp-btn wp-btn-leave" onClick={leaveRoom}>Leave</button>
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
                <span className="wp-member-name">{m.displayName}</span>
                {m.role === 'host' && <span className="wp-host-badge">Host</span>}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
