import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { ROLE_LABEL } from '../utils';
import ProjectFormModal from './ProjectFormModal';
import { Icon, LogoMark } from './icons';
import { Avatar } from './ui';

const navLink = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-card px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-forest-light text-white' : 'text-[#BFD3CB] hover:bg-forest-light/60 hover:text-white'
  }`;

export default function Layout() {
  const { user, isAdmin, canCreateProjects, logout } = useAuth();
  const { projects, refresh } = useProjects();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [location.pathname]);

  const sidebar = (
    <nav className="flex h-full flex-col bg-forest px-3 py-4" aria-label="Main">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <LogoMark />
        <span className="font-display text-lg font-semibold text-white">Issue Tracker</span>
      </div>

      <div className="space-y-1">
        <NavLink to="/" end className={navLink}>
          <Icon name="home" size={17} />
          Dashboard
        </NavLink>
        <NavLink to="/projects" end className={navLink}>
          <Icon name="folder" size={17} />
          All projects
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/users" className={navLink}>
            <Icon name="users" size={17} />
            Users
          </NavLink>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between px-3">
        <h2 className="font-sans text-xs font-medium text-[#8FB0A4]">Your projects</h2>
        {canCreateProjects && (
          <button
            type="button"
            className="rounded p-1 text-[#BFD3CB] hover:bg-forest-light hover:text-white"
            onClick={() => setCreating(true)}
            aria-label="New project"
          >
            <Icon name="plus" size={16} />
          </button>
        )}
      </div>
      <ul className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {projects.map((p) => (
          <li key={p.id}>
            <NavLink to={`/projects/${p.id}`} className={navLink}>
              <span className="w-10 shrink-0 font-display text-xs font-semibold tabular-nums text-[#E0A45E]">{p.key}</span>
              <span className="truncate">{p.name}</span>
            </NavLink>
          </li>
        ))}
        {projects.length === 0 && <li className="px-3 py-2 text-sm text-[#8FB0A4]">No projects yet.</li>}
      </ul>

      <div className="mt-4 flex items-center gap-3 border-t border-forest-light px-2 pt-4">
        <Avatar user={user} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-[#8FB0A4]">{ROLE_LABEL[user.role]}</p>
        </div>
        <button
          type="button"
          className="rounded p-1.5 text-[#BFD3CB] hover:bg-forest-light hover:text-white"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          aria-label="Sign out"
        >
          <Icon name="logout" size={17} />
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-forest/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative h-full w-72 max-w-[85%]">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-chalk/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <button type="button" className="btn btn-ghost !p-1.5" onClick={() => setOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <span className="flex items-center gap-2 font-display font-semibold">
            <LogoMark size={22} />
            Issue Tracker
          </span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>

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
