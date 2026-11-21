import { useCallback, useEffect, useRef, useState } from 'react';
import { attachmentApi } from '../api';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthImage from './AuthImage';
import Modal from './Modal';
import { Icon } from './icons';

const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function AttachmentsSection({ ticketId, canManage, event }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setItems(await attachmentApi.list(ticketId));
    } catch (err) {
      toast.error(errorMessage(err));
      setItems([]);
    }
  }, [ticketId, toast]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  useEffect(() => {
    if (event && event.ticketId === ticketId && event.type?.startsWith('ATTACHMENT')) load();
  }, [event, ticketId, load]);

  const upload = async (files) => {
    for (const file of files) {
      if (!ALLOWED.includes(file.type)) {
        toast.error(`${file.name}: only PNG, JPEG, GIF and WebP images are supported.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5 MB.`);
        continue;
      }
      setUploading(true);
      try {
        const created = await attachmentApi.upload(ticketId, file);
        setItems((list) => [...(list || []), created]);
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setUploading(false);
      }
    }
  };

  const remove = async (a) => {
    try {
      await attachmentApi.remove(a.id);
      setItems((list) => list.filter((x) => x.id !== a.id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <section aria-labelledby="att-h">
      <h3 id="att-h" className="mb-2 text-sm font-semibold">
        Screenshots {items && items.length > 0 && <span className="font-normal text-ink-soft">({items.length})</span>}
      </h3>

      {items && items.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((a) => (
            <li key={a.id} className="group relative overflow-hidden rounded-card border border-line">
              <AuthImage attachment={a} className="h-24 w-full" onOpen={(src) => setPreview({ src, name: a.fileName })} />
              {(canManage || a.uploader?.id === user.id) && (
                <button
                  type="button"
                  onClick={() => remove(a)}
                  className="absolute right-1 top-1 rounded bg-forest/80 p-1 text-white opacity-0 focus:opacity-100 group-hover:opacity-100"
                  aria-label={`Delete ${a.fileName}`}
                >
                  <Icon name="trash" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload([...e.dataTransfer.files]);
        }}
        className={`flex items-center justify-between gap-3 rounded-card border border-dashed px-3 py-3 text-sm ${
          dragOver ? 'border-spruce bg-spruce-tint' : 'border-line-strong'
        }`}
      >
        <span className="text-ink-soft">{uploading ? 'Uploading…' : 'Drop an image here, up to 5 MB.'}</span>
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Icon name="paperclip" size={16} />
          Add screenshot
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            upload([...e.target.files]);
            e.target.value = '';
          }}
        />
      </div>

      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)} width="max-w-4xl">
          <img src={preview.src} alt={preview.name} className="mx-auto max-h-[70vh] rounded-card" />
        </Modal>
      )}
    </section>
  );
}
