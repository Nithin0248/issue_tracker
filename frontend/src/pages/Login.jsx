import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { ErrorNote } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';

const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO === 'true';
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@demo.com', password: 'Admin@123' },
  { label: 'Manager', email: 'manager@demo.com', password: 'Manager@123' },
  { label: 'Developer', email: 'dev@demo.com', password: 'Developer@123' },
];

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from ? `${location.state.from.pathname}${location.state.from.search || ''}` : '/';
  if (user) return <Navigate to={from} replace />;

  const signIn = async (em, pw) => {
    setBusy(true);
    setError('');
    try {
      await login(em.trim(), pw);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use the account you registered with."
      footer={
        <>
          New here?{' '}
          <Link className="font-medium text-spruce underline-offset-2 hover:underline" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          signIn(email, password);
        }}
      >
        <ErrorNote>{error}</ErrorNote>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-autofocus />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {SHOW_DEMO && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="mb-2 text-sm text-ink-soft">Try a demo account</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} type="button" className="btn btn-secondary" disabled={busy} onClick={() => signIn(a.email, a.password)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
