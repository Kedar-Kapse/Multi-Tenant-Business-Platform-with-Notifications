/** Shared form styles so every input looks like the design-system Select / DatePicker. */
export const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white placeholder:text-secondary-400 disabled:opacity-50';

export const labelClass = 'block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5';

export const primaryBtn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';

export const secondaryBtn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl border border-secondary-200 dark:border-secondary-700 text-sm font-medium text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition disabled:opacity-50 disabled:cursor-not-allowed';

export function Field({ label, htmlFor, required, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className={labelClass}>{label}{required && <span className="text-urgent-500"> *</span>}</label>}
      {children}
      {error ? <p className="text-xs text-urgent-600 mt-1">{error}</p> : hint && <p className="text-xs text-secondary-400 mt-1">{hint}</p>}
    </div>
  );
}
