// components/VideoGrid.jsx
// Displays all video tiles in a responsive grid.
// - Local stream is always shown first, mirrored, and muted (to prevent echo).
// - Remote streams are keyed by socketId.
// - Shows a "waiting" placeholder when alone in the room.

import { useRef, useEffect, memo } from 'react';

// ── Single video tile ────────────────────────────────────────────────────────
const VideoTile = memo(function VideoTile({
  stream,
  label,
  isLocal   = false,
  isVideoOff = false,
  socketId,
}) {
  const videoRef = useRef(null);

  // Wire the MediaStream to the <video> element whenever it changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  const initials = label
    ? label.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="video-tile group relative overflow-hidden rounded-2xl bg-dark-700 border border-white/8"
      style={{ aspectRatio: '16/9' }}>

      {/* ── Video element ── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // always mute local feed to prevent echo
        className="w-full h-full object-cover"
        style={{
          transform: isLocal ? 'scaleX(-1)' : 'none', // mirror the local feed
          display: (!stream || isVideoOff) ? 'none' : 'block',
        }}
      />

      {/* ── Avatar placeholder (no stream or video turned off) ── */}
      {(!stream || isVideoOff) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-700">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
            style={{
              background: 'linear-gradient(135deg, rgba(77,111,255,0.25), rgba(139,92,246,0.2))',
              border: '2px solid rgba(77,111,255,0.35)',
            }}>
            <span className="font-display font-bold text-2xl text-brand-300">
              {initials}
            </span>
          </div>
          <span className="font-mono text-[11px] text-gray-500">
            {isVideoOff ? 'Camera off' : 'Connecting…'}
          </span>
        </div>
      )}

      {/* ── Bottom label (visible on hover) ── */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2
        bg-gradient-to-t from-black/70 via-black/30 to-transparent
        translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        <div className="flex items-center gap-2">
          {isLocal && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold
              bg-brand-500/40 text-brand-300 border border-brand-500/40">
              YOU
            </span>
          )}
          <span className="text-white text-xs font-mono truncate">{label}</span>
        </div>
      </div>

      {/* ── "Local" corner badge (always visible) ── */}
      {isLocal && (
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 rounded-md text-[10px] font-mono font-medium
            bg-black/50 text-gray-300 backdrop-blur-sm border border-white/10">
            You
          </span>
        </div>
      )}
    </div>
  );
});

// ── Grid layout ─────────────────────────────────────────────────────────────
export default function VideoGrid({
  localStream,
  remoteStreams,
  mySocketId,
  userName,
  isVideoOff,
  roomId,
}) {
  const remoteEntries = Object.entries(remoteStreams);
  const total = 1 + remoteEntries.length;

  // Responsive grid columns based on participant count
  const gridClass =
    total === 1 ? 'grid-cols-1 max-w-3xl mx-auto' :
    total === 2 ? 'grid-cols-2' :
    total <= 4  ? 'grid-cols-2' :
    total <= 6  ? 'grid-cols-3' :
                  'grid-cols-3';

  return (
    <div className={`flex-1 grid ${gridClass} gap-3 p-4 overflow-auto content-start`}>

      {/* Local tile */}
      <VideoTile
        stream={localStream}
        label={userName || 'You'}
        isLocal={true}
        isVideoOff={isVideoOff}
        socketId={mySocketId}
      />

      {/* Remote tiles */}
      {remoteEntries.map(([socketId, { stream, userName: peerName }]) => (
        <VideoTile
          key={socketId}
          stream={stream}
          label={peerName || socketId.slice(0, 8)}
          isLocal={false}
          socketId={socketId}
        />
      ))}

      {/* Waiting placeholder — only shown when alone */}
      {remoteEntries.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/10
          flex flex-col items-center justify-center p-8 bg-dark-800/30"
          style={{ aspectRatio: '16/9' }}>

          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10
              flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            {/* Animated ping to indicate "waiting" */}
            <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-brand-500">
              <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-75" />
            </span>
          </div>

          <p className="text-gray-500 text-sm font-body mb-1">
            Waiting for others to join…
          </p>
          <p className="text-gray-600 text-xs font-mono">
            Share code:{' '}
            <span className="text-brand-400 font-semibold">{roomId}</span>
          </p>
        </div>
      )}
    </div>
  );
}
