import { useState } from 'react';
import { ticketApi } from '../api';
import { errorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, TYPES, TYPE_LABEL } from '../utils';
import Modal from './Modal';
import { ErrorNote } from './ui';

export default function TicketFormModal({ projectId, members, initialStatus = 'TODO', onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'TASK',
    priority: 'MEDIUM',
    status: initialStatus,
    assigneeId: '',
    dueDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const ticket = await ticketApi.create(projectId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        priority: form.priority,
        status: form.status,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        dueDate: form.dueDate || null,
      });
      toast.success(`${ticket.key} created`);
      onCreated(ticket);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title="New ticket" onClose={onClose} width="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div>
          <label className="label" htmlFor="t-title">
            Title
          </label>
          <input id="t-title" className="input" value={form.title} onChange={set('title')} maxLength={200} required data-autofocus />
        </div>
        <div>
          <label className="label" htmlFor="t-desc">
            Description
          </label>
          <textarea id="t-desc" className="input min-h-[7rem]" value={form.description} onChange={set('description')} maxLength={10000} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="t-type">
              Type
            </label>
            <select id="t-type" className="input" value={form.type} onChange={set('type')}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-priority">
              Priority
            </label>
            <select id="t-priority" className="input" value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-status">
              Status
            </label>
            <select id="t-status" className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-assignee">
              Assignee
            </label>
            <select id="t-assignee" className="input" value={form.assigneeId} onChange={set('assigneeId')}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="t-due">
              Due date
            </label>
            <input id="t-due" type="date" className="input" value={form.dueDate} onChange={set('dueDate')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.title.trim()}>
            {saving ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
