import { useCallback, useEffect, useState } from 'react';
import { commentApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../utils';
import { Avatar } from './ui';

export default function CommentsSection({ ticketId, canManage, event }) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState(null); // { id, text }

  const load = useCallback(async () => {
    try {
      setComments(await commentApi.list(ticketId));
    } catch (err) {
      toast.error(errorMessage(err));
      setComments([]);
    }
  }, [ticketId, toast]);

  useEffect(() => {
    setComments(null);
    load();
  }, [load]);

  useEffect(() => {
    if (event && event.ticketId === ticketId && event.type?.startsWith('COMMENT')) load();
  }, [event, ticketId, load]);

  const add = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const created = await commentApi.add(ticketId, text.trim());
      setComments((list) => [...(list || []), created]);
      setText('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const saveEdit = async () => {
    if (!editing?.text.trim()) return;
    try {
      const updated = await commentApi.update(editing.id, editing.text.trim());
      setComments((list) => list.map((c) => (c.id === updated.id ? updated : c)));
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (c) => {
    try {
      await commentApi.remove(c.id);
      setComments((list) => list.filter((x) => x.id !== c.id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <section aria-labelledby="cm-h">
      <h3 id="cm-h" className="mb-3 text-sm font-semibold">
        Comments {comments && comments.length > 0 && <span className="font-normal text-ink-soft">({comments.length})</span>}
      </h3>

      {comments === null && <p className="text-sm text-ink-soft">Loading comments…</p>}
      {comments && comments.length === 0 && <p className="mb-3 text-sm text-ink-soft">No comments yet. Start the conversation below.</p>}

      <ul className="space-y-4">
        {comments?.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar user={c.author} size={30} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{c.author.name}</span>{' '}
                <span className="text-xs text-ink-soft">
                  {timeAgo(c.createdAt)}
                  {c.updatedAt && ' (edited)'}
                </span>
              </p>
              {editing?.id === c.id ? (
                <div className="mt-1 space-y-2">
                  <textarea
                    className="input min-h-[4.5rem]"
                    value={editing.text}
                    maxLength={4000}
                    onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                    aria-label="Edit comment"
                    data-autofocus
                  />
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-primary" onClick={saveEdit}>
                      Save
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{c.text}</p>
                  {(c.author.id === user.id || canManage) && (
                    <p className="mt-1 flex gap-3 text-xs">
                      {c.author.id === user.id && (
                        <button type="button" className="text-ink-soft underline-offset-2 hover:text-ink hover:underline" onClick={() => setEditing({ id: c.id, text: c.text })}>
                          Edit
                        </button>
                      )}
                      <button type="button" className="text-ink-soft underline-offset-2 hover:text-signal-critical hover:underline" onClick={() => remove(c)}>
                        Delete
                      </button>
                    </p>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-3">
        <Avatar user={user} size={30} />
        <div className="flex-1 space-y-2">
          <textarea
            className="input min-h-[4.5rem]"
            placeholder="Write a comment"
            aria-label="New comment"
            value={text}
            maxLength={4000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add();
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-soft">Ctrl or Cmd + Enter to post</span>
            <button type="button" className="btn btn-primary" onClick={add} disabled={posting || !text.trim()}>
              {posting ? 'Posting…' : 'Add comment'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
