import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
let openModals = 0; // a confirm dialog can open on top of another modal

/**
 * `footer` (optional) is rendered below the scrolling body, so action buttons stay
 * visible on small screens however long the form is.
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    openModals += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      openModals -= 1;
      if (openModals <= 0) { openModals = 0; document.body.style.overflow = ''; }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-secondary-900 rounded-2xl shadow-2xl w-full ${SIZES[size] || SIZES.md} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-secondary-100 dark:border-secondary-800">
          <h2 className="text-base font-semibold text-secondary-900 dark:text-white truncate">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition flex-shrink-0"><FiX size={16} /></button>
        </div>
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-4 sm:px-6 py-3 border-t border-secondary-100 dark:border-secondary-800 flex flex-wrap items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
