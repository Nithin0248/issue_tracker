import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, TYPES, TYPE_LABEL } from '../utils';
import { Icon } from './icons';

export const EMPTY_FILTERS = { q: '', assigneeId: '', priority: '', type: '', status: '' };

export function hasFilters(f) {
  return Object.values(f).some(Boolean);
}

export default function FilterBar({ filters, onChange, members, showStatus = false }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <Icon name="search" size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          className="input !pl-8"
          placeholder="Search title, description or key"
          aria-label="Search tickets"
          value={filters.q}
          onChange={set('q')}
        />
      </div>

      <select className="input !w-auto" aria-label="Filter by assignee" value={filters.assigneeId} onChange={set('assigneeId')}>
        <option value="">All assignees</option>
        <option value="unassigned">Unassigned</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
          </option>
        ))}
      </select>

      <select className="input !w-auto" aria-label="Filter by priority" value={filters.priority} onChange={set('priority')}>
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>

      <select className="input !w-auto" aria-label="Filter by type" value={filters.type} onChange={set('type')}>
        <option value="">Any type</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </select>

      {showStatus && (
        <select className="input !w-auto" aria-label="Filter by status" value={filters.status} onChange={set('status')}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      )}

      {hasFilters(filters) && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </button>
      )}
    </div>
  );
}
