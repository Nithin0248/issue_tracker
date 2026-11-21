import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi, userApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { useToast } from '../context/ToastContext';
import useDebounced from '../hooks/useDebounced';
import ConfirmDialog from './ConfirmDialog';
import { Avatar, ErrorNote, RoleBadge } from './ui';

export default function MembersPanel({ project, members, onMembersChanged, onProjectChanged }) {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { refresh } = useProjects();

  const canManage = isAdmin || project.myRole === 'MANAGER';
  const canDelete = isAdmin || project.owner.id === user.id;

  // add member
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [suggestions, setSuggestions] = useState([]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const debouncedEmail = useDebounced(email, 250);

  useEffect(() => {
    if (!canManage || debouncedEmail.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    userApi
      .search(debouncedEmail.trim())
      .then((list) => {
        if (!cancelled) setSuggestions(list.filter((u) => !members.some((m) => m.userId === u.id)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [debouncedEmail, canManage, members]);

  // project settings
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(null);

  const addMember = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      await projectApi.addMember(project.id, { email: email.trim(), projectRole: role });
      setEmail('');
      toast.success('Member added');
      onMembersChanged();
    } catch (err) {
      setAddError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (m, projectRole) => {
    try {
      await projectApi.setMemberRole(project.id, m.userId, projectRole);
      onMembersChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const removeMember = async () => {
    try {
      await projectApi.removeMember(project.id, removing.userId);
      toast.success(`${removing.name} removed. Their tickets are now unassigned.`);
      setRemoving(null);
      onMembersChanged();
    } catch (err) {
      toast.error(errorMessage(err));
      setRemoving(null);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await projectApi.update(project.id, { name: name.trim(), description: description.trim() || null });
      toast.success('Project saved');
      onProjectChanged();
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const deleteProject = async () => {
    try {
      await projectApi.remove(project.id);
      toast.success(`${project.name} deleted`);
      await refresh();
      navigate('/projects');
    } catch (err) {
      toast.error(errorMessage(err));
      setConfirmDelete(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="members-h">
        <h2 id="members-h" className="mb-3 text-lg font-semibold">
          Members <span className="font-normal text-ink-soft">({members.length})</span>
        </h2>
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar user={{ name: m.name }} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name} {m.owner && <span className="ml-1 text-xs font-normal text-ink-soft">Owner</span>}
                </p>
                <p className="truncate text-xs text-ink-soft">{m.email}</p>
              </div>
              <RoleBadge role={m.globalRole} />
              {canManage && !m.owner ? (
                <select
                  className="input !w-auto"
                  value={m.projectRole}
                  onChange={(e) => changeRole(m, e.target.value)}
                  aria-label={`Project role for ${m.name}`}
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="MANAGER">Manager</option>
                </select>
              ) : (
                <span className="w-28 text-sm text-ink-soft">{m.projectRole === 'MANAGER' ? 'Manager' : 'Developer'}</span>
              )}
              {canManage && !m.owner && (
                <button type="button" className="btn btn-ghost" onClick={() => setRemoving(m)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>

        {canManage && (
          <form onSubmit={addMember} className="mt-5 space-y-3 rounded-card border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold">Add a member</h3>
            <ErrorNote>{addError}</ErrorNote>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[14rem] flex-1">
                <label className="sr-only" htmlFor="m-email">
                  Email address
                </label>
                <input
                  id="m-email"
                  type="email"
                  className="input"
                  placeholder="Email of a registered user"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  list="member-suggestions"
                  required
                />
                <datalist id="member-suggestions">
                  {suggestions.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <select className="input !w-auto" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Project role">
                <option value="DEVELOPER">Developer</option>
                <option value="MANAGER">Manager</option>
              </select>
              <button type="submit" className="btn btn-primary" disabled={adding || !email.trim()}>
                {adding ? 'Adding…' : 'Add member'}
              </button>
            </div>
            <p className="text-xs text-ink-soft">People need an account first. Ask them to register, then add them here.</p>
          </form>
        )}
      </section>

      {canManage && (
        <section aria-labelledby="settings-h" className="space-y-6">
          <form onSubmit={saveSettings} className="space-y-3">
            <h2 id="settings-h" className="text-lg font-semibold">
              Project settings
            </h2>
            <div>
              <label className="label" htmlFor="s-name">
                Name
              </label>
              <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            </div>
            <div>
              <label className="label" htmlFor="s-desc">
                Description
              </label>
              <textarea id="s-desc" className="input min-h-[6rem]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingSettings || !name.trim() || (name === project.name && description === (project.description || ''))}
            >
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>
          </form>

          {canDelete && (
            <div className="rounded-card border border-signal-critical/40 p-4">
              <h3 className="text-sm font-semibold">Delete project</h3>
              <p className="mt-1 text-sm text-ink-soft">Removes the project, all its tickets, comments and screenshots.</p>
              <button type="button" className="btn btn-danger mt-3" onClick={() => setConfirmDelete(true)}>
                Delete project
              </button>
            </div>
          )}
        </section>
      )}

      {removing && (
        <ConfirmDialog
          title={`Remove ${removing.name}?`}
          message="They lose access to this project and any tickets assigned to them become unassigned."
          confirmLabel="Remove"
          onConfirm={removeMember}
          onClose={() => setRemoving(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${project.name}?`}
          message="Every ticket in this project will be deleted. This can't be undone."
          onConfirm={deleteProject}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
