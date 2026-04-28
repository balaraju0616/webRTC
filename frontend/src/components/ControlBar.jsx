// components/ControlBar.jsx
// Bottom control strip with mic, camera, chat toggle, screen-share (placeholder),
// and leave buttons. Tooltips explain each control on hover.

import { useState } from 'react';

// ── Reusable round control button ────────────────────────────────────────────
function ControlBtn({ onClick, title, active = true, danger = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        relative w-12 h-12 rounded-full flex items-center justify-center
        transition-all duration-200 border group
        ${danger
          ? 'bg-red-500 hover:bg-red-400 border-red-400 text-white shadow-lg shadow-red-500/30'
          : active
            ? 'bg-dark-600 border-white/10 text-gray-300 hover:bg-dark-500 hover:text-white hover:border-white/20'
            : 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
        }
      `}
    >
      {children}

      {/* Tooltip */}
      <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap
        px-2 py-1 rounded-md bg-dark-500 border border-white/10 text-[10px] font-mono text-gray-300
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {title}
      </span>
    </button>
  );
}

export default function ControlBar({
  isMuted,
  isVideoOff,
  isChatOpen,
  onToggleMute,
  onToggleVideo,
  onToggleChat,
  onLeave,
  roomId,
}) {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="shrink-0 flex items-center justify-between px-6 py-3.5
      border-t border-white/8 bg-dark-800/90 backdrop-blur-sm">

      {/* ── Left: room info ─────────────────────────────────────────────── */}
      <div className="w-48 flex items-center gap-2">
        <button
          onClick={copyInviteLink}
          className="flex items-center gap-2 px-3 py-2 rounded-xl
            bg-dark-700 border border-white/8 hover:bg-dark-600 transition-colors text-left"
          title="Copy invite link"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <span className="font-mono text-[11px] text-gray-400 truncate">
            {copied ? '✓ Copied!' : roomId}
          </span>
        </button>
      </div>

      {/* ── Center: main controls ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">

        {/* Microphone */}
        <ControlBtn
          onClick={onToggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          active={!isMuted}
        >
          {isMuted ? (
            /* Mic-off icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
              <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/>
            </svg>
          ) : (
            /* Mic-on icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          )}
        </ControlBtn>

        {/* Camera */}
        <ControlBtn
          onClick={onToggleVideo}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          active={!isVideoOff}
        >
          {isVideoOff ? (
            /* Camera-off icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            /* Camera-on icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          )}
        </ControlBtn>

        {/* Leave (destructive, centered visually) */}
        <ControlBtn
          onClick={onLeave}
          title="Leave room"
          danger
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </ControlBtn>

        {/* Chat toggle */}
        <ControlBtn
          onClick={onToggleChat}
          title={isChatOpen ? 'Hide chat' : 'Show chat'}
          active={!isChatOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={isChatOpen ? '#4d6fff' : 'currentColor'} strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </ControlBtn>
      </div>

      {/* ── Right: spacer to balance layout ───────────────────────────── */}
      <div className="w-48" />
    </div>
  );
}
