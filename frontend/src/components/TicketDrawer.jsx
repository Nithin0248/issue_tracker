import { useCallback, useEffect, useRef, useState } from 'react';
import { ticketApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDialog from '../hooks/useDialog';
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, TYPES, TYPE_LABEL, formatDate } from '../utils';
import AttachmentsSection from './AttachmentsSection';
import CommentsSection from './CommentsSection';
import ConfirmDialog from './ConfirmDialog';
import { Icon } from './icons';
import { Avatar, ErrorNote, Spinner, TypeIcon } from './ui';

const toForm = (t) => ({
  title: t.title,
  description: t.description || '',
  type: t.type,
  priority: t.priority,
  assigneeId: t.assignee ? String(t.assignee.id) : '',
  dueDate: t.dueDate || '',
});

export default function TicketDrawer({ ticketId, project, members, event, onClose, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const panelRef = useRef(null);
  useDialog(panelRef, onClose);

  const [ticket, setTicket] = useState(null);
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirtyRef = useRef(false);

  const dirty = Boolean(ticket && form && JSON.stringify(form) !== JSON.stringify(toForm(ticket)));
  dirtyRef.current = dirty;

  const load = useCallback(
    async ({ keepEdits = false } = {}) => {
      try {
        const t = await ticketApi.get(ticketId);
        setTicket(t);
        if (!keepEdits || !dirtyRef.current) setForm(toForm(t));
        setLoadError('');
      } catch (err) {
        setLoadError(errorMessage(err));
      }
    },
    [ticketId],
  );

  useEffect(() => {
    setTicket(null);
    setForm(null);
    load();
  }, [load]);

  // A teammate changed this ticket: refresh it without throwing away what is being typed.
  useEffect(() => {
    if (event && event.ticketId === ticketId && event.type?.startsWith('TICKET')) load({ keepEdits: true });
  }, [event, ticketId, load]);

  // Mirrors the server: admins can manage every project, even where they are a plain member.
  const canManage = user.role === 'ADMIN' || project.myRole === 'MANAGER';
  const isReporter = ticket?.reporter?.id === user.id;
  const isAssignee = ticket?.assignee?.id === user.id;
  const canEdit = canManage || isReporter || isAssignee;
  const canDelete = canManage || isReporter;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const updated = await ticketApi.update(ticketId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        priority: form.priority,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        dueDate: form.dueDate || null,
      });
      setTicket(updated);
      setForm(toForm(updated));
      toast.success(`${updated.key} saved`);
      onChanged();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status) => {
    try {
      const updated = await ticketApi.move(ticketId, status);
      setTicket(updated);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    try {
      await ticketApi.remove(ticketId);
      toast.success(`${ticket.key} deleted`);
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-forest/45" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ticket ? `${ticket.key} ${ticket.title}` : 'Ticket details'}
        className="drawer-in relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-surface shadow-panel"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
          <div className="flex items-center gap-2">
            {ticket && <TypeIcon type={ticket.type} />}
            <span className="key-text">{ticket?.key || '…'}</span>
          </div>
          <div className="flex items-center gap-1">
            {ticket && canDelete && (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={16} />
                Delete
              </button>
            )}
            <button type="button" className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close ticket">
              <Icon name="x" />
            </button>
          </div>
        </header>

        {loadError && (
          <div className="p-5">
            <ErrorNote>{loadError}</ErrorNote>
          </div>
        )}
        {!ticket && !loadError && <Spinner label="Loading ticket" />}

        {ticket && form && (
          <div className="space-y-6 px-5 py-5">
            <form onSubmit={save} className="space-y-4">
              <ErrorNote>{saveError}</ErrorNote>
              <div>
                <label className="sr-only" htmlFor="d-title">
                  Title
                </label>
                <input
                  id="d-title"
                  className="input !border-transparent !px-0 font-display text-xl font-semibold hover:!border-line focus:!border-line-strong focus:!px-3"
                  value={form.title}
                  onChange={set('title')}
                  disabled={!canEdit}
                  maxLength={200}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="d-status">
                    Status
                  </label>
                  <select id="d-status" className="input" value={ticket.status} onChange={(e) => changeStatus(e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="d-priority">
                    Priority
                  </label>
                  <select id="d-priority" className="input" value={form.priority} onChange={set('priority')} disabled={!canEdit}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="d-type">
                    Type
                  </label>
                  <select id="d-type" className="input" value={form.type} onChange={set('type')} disabled={!canEdit}>
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="d-assignee">
                    Assignee
                  </label>
                  <select id="d-assignee" className="input" value={form.assigneeId} onChange={set('assigneeId')} disabled={!canEdit}>
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="d-due">
                    Due date
                  </label>
                  <input id="d-due" type="date" className="input" value={form.dueDate} onChange={set('dueDate')} disabled={!canEdit} />
                </div>
                <div>
                  <span className="label">Reporter</span>
                  <p className="flex items-center gap-2 py-1.5 text-sm">
                    <Avatar user={ticket.reporter} size={22} />
                    {ticket.reporter.name}
                  </p>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="d-desc">
                  Description
                </label>
                <textarea
                  id="d-desc"
                  className="input min-h-[9rem]"
                  value={form.description}
                  onChange={set('description')}
                  disabled={!canEdit}
                  maxLength={10000}
                  placeholder={canEdit ? 'Describe the problem, the steps to reproduce it, or what done looks like.' : 'No description.'}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-ink-soft">
                  Created {formatDate(ticket.createdAt)}. Updated {formatDate(ticket.updatedAt)}.
                  {!canEdit && ' You can change the status and comment, but only the reporter, assignee or a manager can edit the details.'}
                </p>
                {canEdit && (
                  <button type="submit" className="btn btn-primary shrink-0" disabled={!dirty || saving || !form.title.trim()}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                )}
              </div>
            </form>

            <hr className="border-line" />
            <AttachmentsSection ticketId={ticketId} canManage={canManage} event={event} />
            <hr className="border-line" />
            <CommentsSection ticketId={ticketId} canManage={canManage} event={event} />
          </div>
        )}
      </aside>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${ticket?.key}?`}
          message="This removes the ticket with its comments and screenshots. This can't be undone."
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
