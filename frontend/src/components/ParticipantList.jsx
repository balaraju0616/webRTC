// components/ParticipantList.jsx
// Lists all participants currently in the room with avatar, name, and "You" badge.

export default function ParticipantList({ participants, mySocketId, onClose }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-sm text-white">
            Participants
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold
            bg-brand-500/20 text-brand-400 border border-brand-500/30">
            {participants.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs font-mono text-gray-400
            hover:text-white transition-colors"
          title="Back to chat"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Chat
        </button>
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {participants.map((p, i) => {
          const isMe = p.socketId === mySocketId;
          const initials = p.userName
            ? p.userName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
            : '?';

          // Cycle through a small palette of accent colors for variety
          const accentColors = [
            'from-brand-500/30 to-purple-500/20 border-brand-500/30 text-brand-300',
            'from-green-500/20 to-teal-500/15  border-green-500/30  text-green-300',
            'from-orange-500/20 to-red-500/15  border-orange-500/30 text-orange-300',
            'from-pink-500/20  to-rose-500/15  border-pink-500/30   text-pink-300',
          ];
          const accent = accentColors[i % accentColors.length];

          return (
            <div
              key={p.socketId}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                bg-dark-700/40 border border-white/6 hover:bg-dark-700/70 transition-colors"
            >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${accent}
                border flex items-center justify-center shrink-0`}>
                <span className="font-display font-bold text-sm">
                  {initials}
                </span>
              </div>

              {/* Name + socket snippet */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-body truncate">
                    {p.userName}
                  </p>
                  {isMe && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold
                      bg-brand-500/25 text-brand-400 border border-brand-500/30">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-600 font-mono truncate mt-0.5">
                  {p.socketId.slice(0, 12)}…
                </p>
              </div>

              {/* Online dot */}
              <div className="shrink-0">
                <span className="w-2 h-2 rounded-full bg-green-500 block"
                  style={{ boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <p className="text-gray-600 text-xs font-mono text-center mt-8">
            No participants yet
          </p>
        )}
      </div>
    </div>
  );
}
