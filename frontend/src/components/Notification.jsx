// components/Notification.jsx
// Animated toast notification that appears at the bottom-center of the screen.
// Auto-dismissed by the parent (InterviewPage sets a setTimeout to clear it).

const TYPE_STYLES = {
  join:  'bg-green-900/70  border-green-600/50  text-green-200',
  leave: 'bg-yellow-900/70 border-yellow-600/50 text-yellow-200',
  error: 'bg-red-900/70    border-red-600/50    text-red-200',
  info:  'bg-dark-600/90   border-brand-500/40  text-gray-200',
};

const TYPE_ICONS = {
  join: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  leave: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.5">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b8fff" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

export default function Notification({ message, type = 'info' }) {
  const styles = TYPE_STYLES[type] || TYPE_STYLES.info;
  const icon   = TYPE_ICONS[type]  || TYPE_ICONS.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed bottom-24 left-1/2 -translate-x-1/2 z-50 toast-enter
        flex items-center gap-2.5
        px-4 py-2.5 rounded-xl border backdrop-blur-md
        font-mono text-xs shadow-xl whitespace-nowrap
        ${styles}
      `}
    >
      {icon}
      <span>{message}</span>
    </div>
  );
}
