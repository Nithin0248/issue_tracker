import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProjectFormModal from '../components/ProjectFormModal';
import { Icon } from '../components/icons';
import { EmptyState, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';

export default function Projects() {
  const { canCreateProjects } = useAuth();
  const { projects, loading, refresh } = useProjects();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const newButton = canCreateProjects && (
    <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
      <Icon name="plus" size={16} />
      New project
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Projects</h1>
        {newButton}
      </div>

      {loading ? (
        <Spinner label="Loading projects" />
      ) : projects.length === 0 ? (
        <div className="mt-6 rounded-card border border-line bg-surface">
          <EmptyState title="No projects yet" action={newButton || undefined}>
            {canCreateProjects ? 'Create a project to start tracking tickets.' : 'Ask a manager or admin to add you to a project.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-4 hover:bg-chalk">
                <span className="key-text w-14 shrink-0 !text-base">{p.key}</span>
                <span className="min-w-0 flex-1 basis-56">
                  <span className="block truncate font-medium">{p.name}</span>
                  {p.description && <span className="block truncate text-sm text-ink-soft">{p.description}</span>}
                </span>
                <span className="text-sm text-ink-soft">{p.ticketCount} tickets</span>
                <span className="text-sm text-ink-soft">{p.memberCount} members</span>
                <span className="w-24 text-right text-sm text-ink-soft">{p.myRole === 'ADMIN' ? 'Admin' : p.myRole === 'MANAGER' ? 'Manager' : p.myRole === 'DEVELOPER' ? 'Developer' : ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <ProjectFormModal
          onClose={() => setCreating(false)}
          onCreated={async (project) => {
            setCreating(false);
            await refresh();
            navigate(`/projects/${project.id}`);
          }}
        />
      )}
    </div>
  );
}
