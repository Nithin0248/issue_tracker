import { useEffect, useState } from 'react';
import { ticketApi } from '../api';
import { errorMessage } from '../api/client';
import { formatDate, isOverdue, timeAgo } from '../utils';
import { Icon } from './icons';
import { Avatar, EmptyState, ErrorNote, PriorityMark, Spinner, StatusPill, TypeIcon } from './ui';

const PAGE_SIZE = 15;

const COLUMNS = [
  { id: 'number', label: 'Key', sortable: true },
  { id: 'title', label: 'Title', sortable: true },
  { id: 'priority', label: 'Priority', sortable: false },
  { id: 'status', label: 'Status', sortable: true },
  { id: 'assignee', label: 'Assignee', sortable: false },
  { id: 'dueDate', label: 'Due', sortable: true },
  { id: 'updatedAt', label: 'Updated', sortable: true },
];

/** Server-side paged, sorted and filtered ticket list. */
export default function TicketTable({ projectId, filters, reloadKey, onOpen, onClearFilters }) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ field: 'updatedAt', dir: 'desc' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Any filter change goes back to the first page.
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setPage(0);
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    setError('');
    ticketApi
      .search(projectId, {
        q: filters.q,
        status: filters.status,
        priority: filters.priority,
        type: filters.type,
        assigneeId: filters.assigneeId && filters.assigneeId !== 'unassigned' ? filters.assigneeId : undefined,
        unassigned: filters.assigneeId === 'unassigned' ? true : undefined,
        page,
        size: PAGE_SIZE,
        sort: `${sort.field},${sort.dir}`,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filterKey, page, sort, reloadKey]);

  const toggleSort = (field) =>
    setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }));

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Spinner label="Loading tickets" />;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {data.content.length === 0 ? (
        <EmptyState
          title="No tickets match"
          action={
            <button type="button" className="btn btn-secondary" onClick={onClearFilters}>
              Clear filters
            </button>
          }
        >
          Try a different search, or clear the filters to see every ticket.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line bg-chalk text-ink-soft">
              <tr>
                {COLUMNS.map((c) => {
                  const active = sort.field === c.id;
                  return (
                    <th
                      key={c.id}
                      scope="col"
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className="px-3 py-2.5 font-medium"
                    >
                      {c.sortable ? (
                        <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => toggleSort(c.id)}>
                          {c.label}
                          {active && <Icon name={sort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} size={13} />}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.content.map((t) => (
                <tr key={t.id} className="hover:bg-chalk">
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <TypeIcon type={t.type} />
                      <span className="key-text">{t.key}</span>
                    </span>
                  </td>
                  <td className="max-w-[22rem] px-3 py-2.5">
                    <button type="button" className="line-clamp-1 text-left font-medium hover:text-spruce hover:underline" onClick={() => onOpen(t.id)}>
                      {t.title}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <PriorityMark priority={t.priority} showLabel />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={t.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <Avatar user={t.assignee} size={22} />
                      <span className="text-ink-soft">{t.assignee?.name || 'Unassigned'}</span>
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2.5 ${isOverdue(t) ? 'font-medium text-signal-critical' : 'text-ink-soft'}`}>
                    {t.dueDate ? formatDate(t.dueDate) : ''}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{timeAgo(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-line px-3 py-2.5 text-sm" aria-label="Pagination">
          <span className="text-ink-soft">
            {data.totalElements} tickets, page {data.page + 1} of {data.totalPages}
          </span>
          <span className="flex gap-2">
            <button type="button" className="btn btn-secondary" disabled={data.page === 0} onClick={() => setPage((p) => p - 1)}>
              <Icon name="chevronLeft" size={16} />
              Previous
            </button>
            <button type="button" className="btn btn-secondary" disabled={data.page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
              <Icon name="chevronRight" size={16} />
            </button>
          </span>
        </nav>
      )}
    </div>
  );
}
