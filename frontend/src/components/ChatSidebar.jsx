// components/ChatSidebar.jsx
// Live chat panel with message history, auto-scroll, and a send input.

import { useState, useRef, useEffect, memo } from 'react';

// Format a UTC timestamp to HH:MM
function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Single message bubble ────────────────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({ msg, isOwn }) {
  return (
    <div className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
      {/* Sender + time */}
      <span className="text-[10px] font-mono text-gray-500 px-1">
        {isOwn ? 'You' : msg.userName} · {formatTime(msg.timestamp)}
      </span>

      {/* Bubble */}
      <div
        className={`max-w-[88%] px-3.5 py-2 text-sm font-body leading-relaxed break-words
          ${isOwn
            ? 'bg-brand-500 text-white rounded-2xl rounded-tr-sm'
            : 'bg-dark-600 text-gray-200 rounded-2xl rounded-tl-sm border border-white/8'
          }`}
      >
        {msg.text}
      </div>
    </div>
  );
});

// ── Main sidebar component ───────────────────────────────────────────────────
export default function ChatSidebar({
  messages,
  mySocketId,
  onSend,
  participantCount,
  onShowParticipants,
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Auto-scroll whenever new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
    inputRef.current?.focus();
  };

  // Allow Shift+Enter for newlines (future), Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Sidebar header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <span className="font-display font-semibold text-sm text-white">
          Chat
        </span>

        {/* Participant count button → switches to participant list */}
        <button
          onClick={onShowParticipants}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
            text-xs font-mono text-gray-400 hover:text-white
            bg-dark-700 hover:bg-dark-600 border border-white/8 transition-colors"
          title="Show participants"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          {participantCount}
        </button>
      </div>

      {/* ── Message list ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8 opacity-60">
            <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <p className="text-gray-600 text-xs font-mono">No messages yet</p>
            <p className="text-gray-700 text-[11px] font-mono mt-1">Say hello 👋</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.socketId === mySocketId}
            />
          ))
        )}
        {/* Invisible anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* ── Message input ──────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="px-4 py-4 border-t border-white/8 shrink-0"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            className="input-field flex-1 py-2.5 text-sm"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all text-white"
            title="Send message (Enter)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-right text-[10px] font-mono text-gray-700 mt-1.5 pr-1">
          {input.length}/500
        </p>
      </form>
    </div>
  );
}
