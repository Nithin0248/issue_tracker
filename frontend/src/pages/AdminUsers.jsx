import { useEffect, useState } from 'react';
import { userApi } from '../api';
import { errorMessage } from '../api/client';
import { Avatar, ErrorNote, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLE_LABEL } from '../utils';

const ROLES = ['ADMIN', 'MANAGER', 'DEVELOPER'];

export default function AdminUsers() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    userApi
      .all()
      .then(setUsers)
      .catch((err) => setError(errorMessage(err)));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="mb-3 text-2xl font-semibold">Users</h1>
        <ErrorNote>Only admins can manage users.</ErrorNote>
      </div>
    );
  }

  const changeRole = async (u, role) => {
    try {
      const updated = await userApi.setRole(u.id, role);
      setUsers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(`${u.name} is now ${ROLE_LABEL[role]}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        Admins see every project. Managers can create projects. Developers work in the projects they are added to.
      </p>

      {error && <div className="mt-5"><ErrorNote>{error}</ErrorNote></div>}
      {!users && !error && <Spinner label="Loading users" />}

      {users && (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar user={u} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.name} {u.id === user.id && <span className="ml-1 text-xs font-normal text-ink-soft">You</span>}
                </p>
                <p className="truncate text-xs text-ink-soft">{u.email}</p>
              </div>
              <select
                className="input !w-auto"
                value={u.role}
                disabled={u.id === user.id}
                title={u.id === user.id ? "You can't change your own role" : undefined}
                onChange={(e) => changeRole(u, e.target.value)}
                aria-label={`Role for ${u.name}`}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
