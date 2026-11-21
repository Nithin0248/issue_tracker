import { useState } from 'react';
import { projectApi } from '../api';
import { errorMessage } from '../api/client';
import { suggestKey } from '../utils';
import Modal from './Modal';
import { ErrorNote } from './ui';

export default function ProjectFormModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onName = (value) => {
    setName(value);
    if (!keyEdited) setKey(suggestKey(value));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const project = await projectApi.create({ name: name.trim(), key: key.trim(), description: description.trim() || null });
      onCreated(project);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div>
          <label className="label" htmlFor="p-name">
            Name
          </label>
          <input id="p-name" className="input" value={name} onChange={(e) => onName(e.target.value)} maxLength={120} required data-autofocus />
        </div>
        <div>
          <label className="label" htmlFor="p-key">
            Key
          </label>
          <input
            id="p-key"
            className="input w-40 uppercase"
            value={key}
            onChange={(e) => {
              setKeyEdited(true);
              setKey(e.target.value.toUpperCase());
            }}
            maxLength={10}
            pattern="[A-Za-z][A-Za-z0-9]{1,9}"
            title="2-10 letters or digits, starting with a letter"
            required
          />
          <p className="mt-1 text-xs text-ink-soft">Tickets are numbered with this key, for example {key || 'BUG'}-12. It can't be changed later.</p>
        </div>
        <div>
          <label className="label" htmlFor="p-desc">
            Description
          </label>
          <textarea id="p-desc" className="input min-h-[5rem]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim() || key.length < 2}>
            {saving ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
