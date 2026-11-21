import { useEffect, useState } from 'react';
import { attachmentApi } from '../api';

/**
 * Attachments are only served to signed-in project members, so a plain <img src> can't load them
 * (it would not send the Authorization header). Fetch the bytes with axios and show a blob URL.
 */
export default function AuthImage({ attachment, className = '', onOpen }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url = null;
    let cancelled = false;
    attachmentApi
      .blob(attachment.id)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.id]);

  if (failed) {
    return <div className={`flex items-center justify-center bg-lane text-xs text-ink-soft ${className}`}>Can't load image</div>;
  }
  if (!src) return <div className={`animate-pulse bg-lane ${className}`} aria-hidden="true" />;

  return (
    <button type="button" className="block" onClick={() => onOpen?.(src)} aria-label={`Open ${attachment.fileName}`}>
      <img src={src} alt={attachment.fileName} className={`object-cover ${className}`} />
    </button>
  );
}
