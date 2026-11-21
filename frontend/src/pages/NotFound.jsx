import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-5xl font-semibold text-spruce">404</p>
      <h1 className="mt-3 text-xl font-semibold">That page doesn't exist</h1>
      <p className="mt-1 text-sm text-ink-soft">The link may be old, or the ticket or project was deleted.</p>
      <Link to="/" className="btn btn-primary mt-5">
        Go to the dashboard
      </Link>
    </div>
  );
}
