import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/**
 * Dialog. On phones it is a bottom sheet that never exceeds the visible
 * viewport (dvh), so the footer (actions) always stays on screen.
 * `footer` renders outside the scrolling body.
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md', bodyClassName = '' }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Escape first closes an open dropdown / date picker inside the dialog, not the dialog.
      if (document.querySelector('[role="listbox"], [role="dialog"]:not([aria-modal="true"])')) return;
      onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-secondary-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${SIZES[size] || SIZES.md} max-h-[92vh] max-h-[92dvh] sm:max-h-[90vh] sm:max-h-[90dvh] flex flex-col`}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-secondary-100 dark:border-secondary-800">
          <h2 className="text-base font-semibold text-secondary-900 dark:text-white truncate min-w-0">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 -mr-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition flex-shrink-0"><FiX size={18} /></button>
        </div>
        <div className={`px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
        {footer && (
          <div className="px-4 sm:px-6 py-3 border-t border-secondary-100 dark:border-secondary-800 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
