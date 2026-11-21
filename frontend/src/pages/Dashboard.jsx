import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api';
import { errorMessage } from '../api/client';
import { EmptyState, ErrorNote, PriorityMark, Spinner, StatusPill, TypeIcon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { STATUSES, STATUS_COLOR, STATUS_LABEL, formatDate, isOverdue } from '../utils';

export default function Dashboard() {
  const { user, canCreateProjects } = useAuth();
  const { projects } = useProjects();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .get()
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const firstName = user.name.split(' ')[0];
  const counts = STATUSES.map((s) => ({ status: s, n: data?.assignedByStatus?.[s] ?? 0 }));
  const total = counts.reduce((sum, c) => sum + c.n, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Hi, {firstName}</h1>
      <p className="mt-1 text-sm text-ink-soft">Here is what is on your plate.</p>

      {error && <div className="mt-5"><ErrorNote>{error}</ErrorNote></div>}
      {!data && !error && <Spinner label="Loading your dashboard" />}

      {data && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="assigned-h">
            <h2 id="assigned-h" className="mb-3 text-lg font-semibold">
              Assigned to you
            </h2>

            {total === 0 ? (
              <div className="rounded-card border border-line bg-surface">
                <EmptyState title="Nothing is assigned to you">
                  When someone assigns you a ticket, it shows up here.
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-lane" role="img" aria-label={counts.map((c) => `${c.n} ${STATUS_LABEL[c.status]}`).join(', ')}>
                  {counts.map((c) =>
                    c.n > 0 ? <div key={c.status} style={{ width: `${(c.n / total) * 100}%`, background: STATUS_COLOR[c.status] }} /> : null,
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
                  {counts.map((c) => (
                    <li key={c.status} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[c.status] }} aria-hidden="true" />
                      <span className="font-medium text-ink">{c.n}</span> {STATUS_LABEL[c.status]}
                    </li>
                  ))}
                </ul>

                <h3 className="mb-2 mt-6 text-sm font-semibold">Open work, most recently updated first</h3>
                {data.recentAssigned.length === 0 ? (
                  <p className="text-sm text-ink-soft">Everything assigned to you is done.</p>
                ) : (
                  <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                    {data.recentAssigned.map((t) => (
                      <li key={t.id}>
                        <Link to={`/projects/${t.projectId}?ticket=${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-chalk">
                          <span className="flex w-24 shrink-0 items-center gap-1.5">
                            <TypeIcon type={t.type} />
                            <span className="key-text">{t.key}</span>
                          </span>
                          <span className="min-w-0 flex-1 basis-48 truncate text-sm font-medium">{t.title}</span>
                          <span className="text-xs text-ink-soft">
                            <PriorityMark priority={t.priority} showLabel />
                          </span>
                          <StatusPill status={t.status} />
                          {t.dueDate && (
                            <span className={`text-xs ${isOverdue(t) ? 'font-medium text-signal-critical' : 'text-ink-soft'}`}>
                              Due {formatDate(t.dueDate)}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <aside className="space-y-6">
            <section aria-labelledby="projects-h">
              <h2 id="projects-h" className="mb-3 text-lg font-semibold">
                Projects
              </h2>
              {projects.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  {canCreateProjects ? (
                    <>
                      You are not in a project yet. <Link className="font-medium text-spruce hover:underline" to="/projects">Create one</Link>.
                    </>
                  ) : (
                    'You are not in a project yet. Ask a manager to add you.'
                  )}
                </p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Link to={`/projects/${p.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-chalk">
                        <span className="key-text w-12 shrink-0">{p.key}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-ink-soft">{p.ticketCount}</span>
                        <span className="sr-only">tickets</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <p className="text-sm text-ink-soft">
              You have reported <span className="font-medium text-ink">{data.reportedByMe}</span> {data.reportedByMe === 1 ? 'ticket' : 'tickets'}.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
