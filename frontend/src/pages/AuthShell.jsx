import TicketCard from '../components/TicketCard';
import { LogoMark } from '../components/icons';

const SAMPLE = [
  { id: 1, key: 'WEB-14', title: 'Checkout fails when the cart has a sold-out item', type: 'BUG', priority: 'CRITICAL', status: 'IN_PROGRESS', assignee: { name: 'Priya Nair' }, dueDate: null },
  { id: 2, key: 'WEB-18', title: 'Add password reset by email', type: 'STORY', priority: 'HIGH', status: 'TODO', assignee: { name: 'Dev Dillon' }, dueDate: null },
  { id: 3, key: 'WEB-9', title: 'Write the API documentation', type: 'TASK', priority: 'LOW', status: 'DONE', assignee: { name: 'Maya Manager' }, dueDate: null },
];

/** Split layout for sign in / register: a quiet form beside a small preview of the board. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-display text-xl font-semibold">Issue Tracker</span>
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">{subtitle}</p>
          {children}
          <div className="mt-6 text-sm text-ink-soft">{footer}</div>
        </div>
      </div>

      <div className="hidden flex-col justify-center bg-forest px-12 py-10 lg:flex" aria-hidden="true">
        <p className="mb-6 max-w-md font-display text-3xl font-semibold leading-tight text-white">
          Every bug gets an owner and a next step.
        </p>
        <div className="grid max-w-md gap-3">
          {SAMPLE.map((t, i) => (
            <div key={t.id} style={{ marginLeft: i * 28 }}>
              <TicketCard ticket={t} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
