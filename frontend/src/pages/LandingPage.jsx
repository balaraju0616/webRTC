// pages/LandingPage.jsx
// Entry screen where users choose a userName and roomId before joining.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Simple random Room ID generator — no extra dependency needed
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // unambiguous charset
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [roomId,   setRoomId]   = useState('');
  const [userName, setUserName] = useState('');
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);
  const [mounted,  setMounted]  = useState(false);

  // Trigger entrance animation after mount
  useEffect(() => setMounted(true), []);

  const validate = () => {
    if (!userName.trim()) { setError('Please enter your name'); return false; }
    if (!roomId.trim())   { setError('Please enter a Room ID'); return false; }
    return true;
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!validate()) return;
    navigate(`/room/${roomId.trim().toUpperCase()}`, {
      state: { userName: userName.trim() },
    });
  };

  const handleCreateRoom = () => {
    if (!userName.trim()) { setError('Enter your name first, then create a room'); return; }
    const newId = generateRoomId();
    navigate(`/room/${newId}`, { state: { userName: userName.trim() } });
  };

  const copyLink = () => {
    if (!roomId.trim()) return;
    const url = `${window.location.origin}/room/${roomId.trim().toUpperCase()}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-dark-900 bg-grid flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Ambient glow blobs ──────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(77,111,255,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* ── Main card ───────────────────────────────────────────────────── */}
      <div
        className="w-full max-w-[420px] relative z-10"
        style={{
          opacity:    mounted ? 1 : 0,
          transform:  mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {/* Logo + headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-4 shadow-lg"
            style={{ boxShadow: '0 0 32px rgba(77,111,255,0.4)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
            </svg>
          </div>
          <h1 className="font-display font-bold text-3xl text-white tracking-tight">
            Interview<span className="text-brand-400">Pro</span>
          </h1>
          <p className="text-gray-500 text-sm font-body mt-2">
            Professional remote interviews · Powered by WebRTC
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card p-7">
          <form onSubmit={handleJoin} noValidate>
            {/* Name input */}
            <div className="mb-4">
              <label className="block text-[11px] font-mono font-medium text-gray-400 mb-2 uppercase tracking-widest">
                Your Name
              </label>
              <input
                type="text"
                autoFocus
                autoComplete="name"
                className="input-field"
                placeholder="e.g. Alex Johnson"
                value={userName}
                onChange={(e) => { setUserName(e.target.value); setError(''); }}
                maxLength={32}
              />
            </div>

            {/* Room ID input with copy button */}
            <div className="mb-5">
              <label className="block text-[11px] font-mono font-medium text-gray-400 mb-2 uppercase tracking-widest">
                Room ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1 font-mono uppercase"
                  placeholder="e.g. TECH42"
                  value={roomId}
                  onChange={(e) => { setRoomId(e.target.value.toUpperCase()); setError(''); }}
                  maxLength={20}
                />
                {roomId.trim() && (
                  <button
                    type="button"
                    onClick={copyLink}
                    title="Copy invite link"
                    className="btn-ghost shrink-0 px-3"
                  >
                    {copied ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-red-400 text-xs font-mono">{error}</p>
              </div>
            )}

            {/* Join button */}
            <button type="submit" className="btn-primary w-full text-base py-3.5">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
              Join Room
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[11px] text-gray-600 font-mono tracking-widest">OR</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Create new room */}
          <button type="button" onClick={handleCreateRoom} className="btn-ghost w-full py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Create New Room
          </button>
        </div>

        {/* Feature pills */}
        <div className="flex justify-center flex-wrap gap-3 mt-7">
          {[
            { icon: '⚡', label: 'Peer-to-Peer WebRTC' },
            { icon: '🔒', label: 'No recordings stored' },
            { icon: '💬', label: 'Live chat' },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/4 border border-white/8 text-xs text-gray-500 font-body"
            >
              <span>{icon}</span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
