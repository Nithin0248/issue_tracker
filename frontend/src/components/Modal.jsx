import { useId, useRef } from 'react';
import useDialog from '../hooks/useDialog';
import { Icon } from './icons';

export default function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  const ref = useRef(null);
  const titleId = useId();
  useDialog(ref, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-forest/55" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-[92vh] w-full ${width} overflow-y-auto rounded-t-xl bg-surface shadow-panel sm:rounded-xl`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
