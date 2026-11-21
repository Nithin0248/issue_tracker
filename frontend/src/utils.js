export const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
export const STATUS_LABEL = { TODO: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done' };
export const STATUS_COLOR = { TODO: '#66767F', IN_PROGRESS: '#2F73A8', DONE: '#1F6B52' };

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const PRIORITY_LABEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };
export const PRIORITY_LEVEL = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
export const PRIORITY_COLOR = {
  LOW: '#7F9189',
  MEDIUM: '#B8941F',
  HIGH: '#D77A1E',
  CRITICAL: '#C23A2E',
};

export const TYPES = ['BUG', 'TASK', 'STORY'];
export const TYPE_LABEL = { BUG: 'Bug', TASK: 'Task', STORY: 'Story' };

export const ROLE_LABEL = { ADMIN: 'Admin', MANAGER: 'Manager', DEVELOPER: 'Developer' };

/** "2026-11-18" or a full ISO timestamp -> "18 Nov 2026" */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return n > 6 && unit === 'day' ? formatDate(value) : rtf.format(-n, unit);
    }
  }
  return 'just now';
}

export function isOverdue(ticket) {
  return Boolean(
    ticket.dueDate && ticket.status !== 'DONE' && new Date(`${ticket.dueDate}T23:59:59`) < new Date(),
  );
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function suggestKey(name = '') {
  const words = name.trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (!words.length) return '';
  const key = words.length === 1 ? words[0].slice(0, 4) : words.map((w) => w[0]).join('').slice(0, 5);
  return key.toUpperCase();
}
