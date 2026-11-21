import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { ErrorNote } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';

export default function Register() {
  const { user, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="The first account on a fresh install becomes the admin. Everyone after that starts as a developer."
      footer={
        <>
          Already registered?{' '}
          <Link className="font-medium text-spruce underline-offset-2 hover:underline" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <ErrorNote>{error}</ErrorNote>
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required data-autofocus />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" type="password" className="input" autoComplete="new-password" minLength={8} maxLength={100} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
