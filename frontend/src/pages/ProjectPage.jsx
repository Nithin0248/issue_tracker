import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { projectApi, ticketApi } from '../api';
import { errorMessage } from '../api/client';
import FilterBar, { EMPTY_FILTERS } from '../components/FilterBar';
import KanbanBoard from '../components/KanbanBoard';
import MembersPanel from '../components/MembersPanel';
import TicketDrawer from '../components/TicketDrawer';
import TicketFormModal from '../components/TicketFormModal';
import TicketTable from '../components/TicketTable';
import { Icon } from '../components/icons';
import { ErrorNote, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDebounced from '../hooks/useDebounced';
import useProjectEvents from '../hooks/useProjectEvents';

const TABS = [
  ['board', 'Board'],
  ['list', 'List'],
  ['team', 'Team'],
];

export default function ProjectPage() {
  const { projectId } = useParams();
  const pid = Number(projectId);
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'board';
  const openTicketId = params.get('ticket') ? Number(params.get('ticket')) : null;

  const { user } = useAuth();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [pageError, setPageError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const debouncedQ = useDebounced(filters.q, 300);
  const [board, setBoard] = useState(null);
  const [boardError, setBoardError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(null); // null or { status }
  const [event, setEvent] = useState(null);
  const eventTimer = useRef(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const loadProject = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([projectApi.get(pid), projectApi.members(pid)]);
      setProject(p);
      setMembers(m);
    } catch (err) {
      setPageError(errorMessage(err));
    }
  }, [pid]);

  useEffect(() => {
    setProject(null);
    setBoard(null);
    setPageError('');
    setFilters(EMPTY_FILTERS);
    loadProject();
  }, [loadProject]);

  // Board data (re-fetched when filters change or something else bumps reloadKey).
  useEffect(() => {
    if (tab !== 'board' || !project) return undefined;
    let cancelled = false;
    ticketApi
      .board(pid, {
        q: debouncedQ,
        priority: filters.priority,
        type: filters.type,
        assigneeId: filters.assigneeId && filters.assigneeId !== 'unassigned' ? filters.assigneeId : undefined,
        unassigned: filters.assigneeId === 'unassigned' ? true : undefined,
      })
      .then((b) => {
        if (cancelled) return;
        setBoard(b);
        setBoardError('');
      })
      .catch((err) => {
        if (!cancelled) setBoardError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [pid, project, tab, debouncedQ, filters.priority, filters.type, filters.assigneeId, reloadKey]);

  // Live updates from teammates.
  useProjectEvents(pid, (e) => {
    if (e.actorId === user.id) return; // our own changes already refresh locally
    setEvent({ ...e, n: Date.now() });
    clearTimeout(eventTimer.current);
    eventTimer.current = setTimeout(reload, 250);
  });
  useEffect(() => () => clearTimeout(eventTimer.current), []);

  const setParam = (key, value) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value == null) next.delete(key);
      else next.set(key, value);
      return next;
    });

  const handleMove = async (ticket, status, position) => {
    try {
      await ticketApi.move(ticket.id, status, position);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      reload(); // on failure this also snaps the card back to where the server says it is
    }
  };

  if (pageError) {
    return (
      <div className="max-w-xl">
        <h1 className="mb-3 text-2xl font-semibold">Can't open this project</h1>
        <ErrorNote>{pageError}</ErrorNote>
      </div>
    );
  }
  if (!project) return <Spinner label="Loading project" />;

  const searching = Object.values(filters).some(Boolean);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-baseline gap-3 text-2xl font-semibold">
            <span className="key-text !text-lg">{project.key}</span>
            <span className="truncate">{project.name}</span>
          </h1>
          {project.description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{project.description}</p>}
        </div>
        {tab !== 'team' && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating({ status: 'TODO' })}>
            <Icon name="plus" size={16} />
            New ticket
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Project views" className="mt-5 flex gap-1 border-b border-line">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setParam('tab', id === 'board' ? null : id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? 'border-spruce text-spruce' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab !== 'team' && (
          <div className="mb-5">
            <FilterBar filters={filters} onChange={setFilters} members={members} showStatus={tab === 'list'} />
          </div>
        )}

        {tab === 'board' && (
          <>
            {boardError && <ErrorNote>{boardError}</ErrorNote>}
            {!board && !boardError && <Spinner label="Loading board" />}
            {board && <KanbanBoard board={board} onMove={handleMove} onOpen={(id) => setParam('ticket', id)} onAdd={(status) => setCreating({ status })} />}
          </>
        )}

        {tab === 'list' && (
          <TicketTable
            projectId={pid}
            filters={{ ...filters, q: debouncedQ }}
            reloadKey={reloadKey}
            onOpen={(id) => setParam('ticket', id)}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
          />
        )}

        {tab === 'team' && (
          <MembersPanel project={project} members={members} onMembersChanged={loadProject} onProjectChanged={loadProject} />
        )}
      </div>

      {searching && tab === 'board' && board && (
        <p className="mt-3 text-xs text-ink-soft">Filters are on, so some tickets may be hidden. New cards you drop are still saved in order.</p>
      )}

      {creating && (
        <TicketFormModal
          projectId={pid}
          members={members}
          initialStatus={creating.status}
          onClose={() => setCreating(null)}
          onCreated={() => {
            setCreating(null);
            reload();
          }}
        />
      )}

      {openTicketId && (
        <TicketDrawer
          ticketId={openTicketId}
          project={project}
          members={members}
          event={event}
          onClose={() => setParam('ticket', null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
