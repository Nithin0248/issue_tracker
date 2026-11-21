import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  PRIORITY_LEVEL,
  ROLE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  TYPE_LABEL,
  initials,
} from '../utils';

const AVATAR_COLORS = ['#1F6B52', '#2F73A8', '#7B4F93', '#A55618', '#A23B5A', '#4F6D2E', '#3C6E8F'];

export function Avatar({ user, size = 28 }) {
  if (!user) {
    return (
      <span
        title="Unassigned"
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-faint"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
        </svg>
        <span className="sr-only">Unassigned</span>
      </span>
    );
  }
  const hash = [...user.name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <span
      title={user.name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, background: AVATAR_COLORS[hash % AVATAR_COLORS.length], fontSize: size * 0.4 }}
    >
      {initials(user.name)}
      <span className="sr-only">{user.name}</span>
    </span>
  );
}

/** Four ascending bars; the number filled in is the priority level. */
export function PriorityMark({ priority, showLabel = false }) {
  const level = PRIORITY_LEVEL[priority] || 1;
  const color = PRIORITY_COLOR[priority] || PRIORITY_COLOR.LOW;
  return (
    <span className="inline-flex items-center gap-1.5" title={`${PRIORITY_LABEL[priority]} priority`}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 3.6} y={10 - i * 3} width="2.4" height={4 + i * 3} rx="0.6" fill={i < level ? color : '#D3DAD5'} />
        ))}
      </svg>
      {showLabel ? (
        <span>{PRIORITY_LABEL[priority]}</span>
      ) : (
        <span className="sr-only">{PRIORITY_LABEL[priority]} priority</span>
      )}
    </span>
  );
}

export function TypeIcon({ type, size = 15 }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true };
  return (
    <span className="inline-flex" title={TYPE_LABEL[type]}>
      {type === 'BUG' && (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="#C23A2E" />
          <circle cx="8" cy="8" r="2.4" fill="#fff" />
        </svg>
      )}
      {type === 'STORY' && (
        <svg {...common}>
          <path d="M3 1.5h10v13l-5-3.2-5 3.2z" fill="#6B5BB5" />
        </svg>
      )}
      {type === 'TASK' && (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#2F73A8" />
          <path d="M4.6 8.2l2.3 2.3 4.5-4.7" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className="sr-only">{TYPE_LABEL[type]}</span>
    </span>
  );
}

export function StatusPill({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-ink">
      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[status] }} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className="rounded-full border border-line-strong px-2 py-0.5 text-xs text-ink-soft">
      {ROLE_LABEL[role] || role}
    </span>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-soft" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-spruce" aria-hidden="true" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-card border border-signal-critical/40 bg-signal-critical/10 px-3 py-2 text-sm text-[#8d2a21]">
      {children}
    </p>
  );
}
