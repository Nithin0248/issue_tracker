import { PRIORITY_COLOR, formatDate, isOverdue } from '../utils';
import { Avatar, PriorityMark, TypeIcon } from './ui';
import { Icon } from './icons';

/**
 * Index-card style ticket. The coloured spine on the left is the priority, so a column can be
 * scanned for urgent work without reading anything.
 */
export default function TicketCard({ ticket, overlay = false }) {
  const overdue = isOverdue(ticket);
  return (
    <div
      className={`rounded-card border border-line bg-surface p-3 pl-3.5 text-left ${
        overlay ? 'rotate-[1.5deg] shadow-lift' : 'hover:border-line-strong hover:shadow-sm'
      }`}
      style={{ borderLeft: `4px solid ${PRIORITY_COLOR[ticket.priority]}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <TypeIcon type={ticket.type} />
          <span className="key-text">{ticket.key}</span>
        </span>
        <Avatar user={ticket.assignee} size={24} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-ink">{ticket.title}</p>
      <div className="mt-2.5 flex items-center gap-3 text-xs text-ink-soft">
        <PriorityMark priority={ticket.priority} showLabel />
        {ticket.dueDate && (
          <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-signal-critical' : ''}`}>
            <Icon name="calendar" size={13} />
            {formatDate(ticket.dueDate)}
            {overdue && <span className="sr-only"> (overdue)</span>}
          </span>
        )}
      </div>
    </div>
  );
}
