// pages/InterviewPage.jsx
// The core interview room page.
// Orchestrates:
//   - Socket.IO connection & all room events
//   - WebRTC peer connections (via useWebRTC)
//   - Chat messages
//   - Participant list state
//   - UI layout (video grid + sidebar + control bar)

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useWebRTC }    from '../hooks/useWebRTC';
import VideoGrid        from '../components/VideoGrid';
import ChatSidebar      from '../components/ChatSidebar';
import ParticipantList  from '../components/ParticipantList';
import ControlBar       from '../components/ControlBar';
import Notification     from '../components/Notification';

export default function InterviewPage() {
  const { roomId }  = useParams();
  const location    = useLocation();
  const navigate    = useNavigate();
  const userName    = location.state?.userName;

  // ── Socket ref ─────────────────────────────────────────────────────────
  const { getSocket, disconnect } = useWebSocket();
  const socketRef = useRef(null);

  // ── Room state ─────────────────────────────────────────────────────────
  const [mySocketId,        setMySocketId]        = useState(null);
  const [participants,      setParticipants]       = useState([]);
  const [messages,          setMessages]           = useState([]);
  const [notification,      setNotification]       = useState(null);
  const [connectionStatus,  setConnectionStatus]   = useState('connecting');
  const [isChatOpen,        setIsChatOpen]         = useState(true);
  const [showParticipants,  setShowParticipants]   = useState(false);
  const [mediaError,        setMediaError]         = useState(null);

  // ── WebRTC hook (needs the socket to send ICE candidates) ──────────────
  const {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    initLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removeRemoteStream,
    toggleMute,
    toggleVideo,
    cleanup: cleanupWebRTC,
  } = useWebRTC(socketRef.current);

  // Keep a ref so socket callbacks can access it without stale closures
  const participantsRef = useRef([]);
  participantsRef.current = participants;

  // ── Redirect to landing if userName is missing ──────────────────────────
  useEffect(() => {
    if (!userName) navigate('/', { replace: true });
  }, [userName, navigate]);

  // ── Toast helper ────────────────────────────────────────────────────────
  const showNotification = useCallback((msg, type = 'info') => {
    setNotification({ msg, type, id: Date.now() });
  }, []);

  // ── Main setup: acquire media → connect socket → join room ─────────────
  useEffect(() => {
    if (!userName) return;
    let isMounted = true;

    const setup = async () => {
      // Step 1 — get camera/mic
      try {
        await initLocalStream();
      } catch (err) {
        if (!isMounted) return;
        const msg = err.name === 'NotAllowedError'
          ? 'Camera / microphone permission denied. Please allow access and refresh.'
          : 'Could not access your camera or microphone.';
        setMediaError(msg);
        showNotification(msg, 'error');
        // Continue anyway — we can still do audio-only or chat-only
      }

      // Step 2 — connect socket
      const socket = getSocket();
      socketRef.current = socket;

      // ── Connection lifecycle ──────────────────────────────────────────
      socket.on('connect', () => {
        if (!isMounted) return;
        setConnectionStatus('connected');
        // Re-join room on reconnect as well
        socket.emit('join-room', { roomId, userName });
      });

      socket.on('disconnect', (reason) => {
        if (!isMounted) return;
        setConnectionStatus('disconnected');
        if (reason !== 'io client disconnect') {
          showNotification('Connection lost — reconnecting…', 'error');
        }
      });

      socket.on('reconnect', () => {
        if (!isMounted) return;
        setConnectionStatus('connected');
        showNotification('Reconnected!', 'info');
      });

      // ── Room events ────────────────────────────────────────────────────
      // Confirmation that we have joined the room
      socket.on('room-joined', ({ socketId, participants: ps, messages: msgs }) => {
        if (!isMounted) return;
        setMySocketId(socketId);
        setParticipants(ps || []);
        setMessages(msgs || []);
      });

      // Another peer just joined → we create an offer toward them
      socket.on('user-joined', ({ socketId: newId, userName: newName }) => {
        if (!isMounted) return;
        // Avoid duplicates
        setParticipants((prev) => {
          if (prev.find((p) => p.socketId === newId)) return prev;
          return [...prev, { socketId: newId, userName: newName }];
        });
        showNotification(`${newName} joined the room`, 'join');
        // The existing peer (us) sends the offer
        createOffer(newId, newName);
      });

      // A peer left the room
      socket.on('user-left', ({ socketId: leftId, userName: leftName }) => {
        if (!isMounted) return;
        setParticipants((prev) => prev.filter((p) => p.socketId !== leftId));
        removeRemoteStream(leftId);
        showNotification(`${leftName} left the room`, 'leave');
      });

      // ── WebRTC signaling ───────────────────────────────────────────────
      // Incoming offer from an existing peer
      socket.on('webrtc-offer', async ({ offer, senderSocketId }) => {
        if (!isMounted) return;
        // Look up the sender's userName from our participant list
        const senderName =
          participantsRef.current.find((p) => p.socketId === senderSocketId)?.userName
          || senderSocketId;
        await handleOffer({ offer, senderSocketId, userName: senderName });
      });

      // Incoming answer to our offer
      socket.on('webrtc-answer', async ({ answer, senderSocketId }) => {
        if (!isMounted) return;
        await handleAnswer({ answer, senderSocketId });
      });

      // Incoming ICE candidate from any peer
      socket.on('ice-candidate', async ({ candidate, senderSocketId }) => {
        if (!isMounted) return;
        await handleIceCandidate({ candidate, senderSocketId });
      });

      // ── Chat ───────────────────────────────────────────────────────────
      socket.on('chat-message', (message) => {
        if (!isMounted) return;
        setMessages((prev) => [...prev, message]);
      });

      // ── Server error ───────────────────────────────────────────────────
      socket.on('error', ({ message: errMsg }) => {
        if (!isMounted) return;
        showNotification(errMsg, 'error');
      });

      // If socket already connected (e.g. hot-reload), join right away
      if (socket.connected) {
        setConnectionStatus('connected');
        socket.emit('join-room', { roomId, userName });
      }
    };

    setup();

    // ── Cleanup on unmount / roomId change ─────────────────────────────
    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId });
        socketRef.current.off(); // remove ALL listeners registered above
      }
      cleanupWebRTC();
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userName]);

  // ── Send a chat message ─────────────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    if (!socketRef.current || !text.trim()) return;
    socketRef.current.emit('chat-message', { roomId, text });
  }, [roomId]);

  // ── Leave room intentionally ────────────────────────────────────────────
  const handleLeave = useCallback(() => {
    cleanupWebRTC();
    disconnect();
    navigate('/');
  }, [cleanupWebRTC, disconnect, navigate]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden select-none">

      {/* ── Top header bar ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3
        border-b border-white/8 bg-dark-800/80 backdrop-blur-sm shrink-0 z-10">

        {/* Left: logo + room breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
              </svg>
            </div>
            <span className="font-display font-bold text-white text-sm">InterviewPro</span>
          </div>
          <span className="text-dark-400 select-none">/</span>
          <span className="font-mono text-xs text-gray-400 bg-dark-700 px-2 py-1 rounded-md border border-white/8">
            {roomId}
          </span>
        </div>

        {/* Right: status + participant count */}
        <div className="flex items-center gap-3">
          {connectionStatus === 'connected' && (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-green-400">
              <span className="live-dot" />
              LIVE
            </span>
          )}
          {connectionStatus === 'connecting' && (
            <span className="font-mono text-[11px] text-yellow-400 animate-pulse">
              CONNECTING…
            </span>
          )}
          {connectionStatus === 'disconnected' && (
            <span className="font-mono text-[11px] text-red-400 animate-pulse">
              RECONNECTING…
            </span>
          )}

          <button
            onClick={() => { setShowParticipants(true); setIsChatOpen(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
              bg-dark-600 border border-white/10 hover:bg-dark-500 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <span className="font-mono text-xs text-gray-300">{participants.length}</span>
          </button>
        </div>
      </header>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Video grid — takes all remaining horizontal space */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            mySocketId={mySocketId}
            userName={userName}
            isVideoOff={isVideoOff}
            roomId={roomId}
          />
        </div>

        {/* Collapsible sidebar */}
        {isChatOpen && (
          <aside className="w-80 shrink-0 border-l border-white/8 flex flex-col bg-dark-800/50 backdrop-blur-sm overflow-hidden">
            {showParticipants ? (
              <ParticipantList
                participants={participants}
                mySocketId={mySocketId}
                onClose={() => setShowParticipants(false)}
              />
            ) : (
              <ChatSidebar
                messages={messages}
                mySocketId={mySocketId}
                onSend={sendMessage}
                participantCount={participants.length}
                onShowParticipants={() => setShowParticipants(true)}
              />
            )}
          </aside>
        )}
      </div>

      {/* ── Control bar ────────────────────────────────────────────────── */}
      <ControlBar
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isChatOpen={isChatOpen}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleChat={() => { setIsChatOpen((v) => !v); }}
        onLeave={handleLeave}
        roomId={roomId}
      />

      {/* ── Toast notification ──────────────────────────────────────────── */}
      {notification && (
        <Notification
          key={notification.id}
          message={notification.msg}
          type={notification.type}
        />
      )}
    </div>
  );
}
