import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

export function Spinner({ size = 'md', className = '' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : size === 'lg' ? 'w-8 h-8 border-[3px]' : 'w-6 h-6 border-2';
  return <span role="status" aria-label="Loading" className={`inline-block ${s} border-primary-500 border-t-transparent rounded-full animate-spin ${className}`} />;
}

export function LoadingState({ label = 'Loading…', className = 'py-16' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-sm text-secondary-400 ${className}`}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ title = 'Could not load this', message, onRetry, className = 'py-14' }) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center text-center px-4 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-urgent-50 dark:bg-urgent-900/20 flex items-center justify-center mb-3">
        <FiAlertCircle className="text-urgent-600" size={20} />
      </div>
      <h3 className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">{title}</h3>
      {message && <p className="text-xs text-secondary-500 mt-1 max-w-sm">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition">
          <FiRefreshCw size={12} /> Try again
        </button>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

/** Page title row: title + subtitle on the left, actions wrap below on phones. */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Label + control + error text. */
export function Field({ label, required, error, hint, htmlFor, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          {label} {required && <span className="text-urgent-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-urgent-600 dark:text-urgent-400 mt-1">{error}</p>
        : hint ? <p className="text-[11px] text-secondary-400 mt-1">{hint}</p> : null}
    </div>
  );
}

export function Pagination({ page, totalPages, totalElements, onChange, disabled }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-secondary-100 dark:border-secondary-800">
      <p className="text-xs text-secondary-500">
        Page {page + 1} of {totalPages}{totalElements != null && <span className="hidden sm:inline"> · {totalElements} total</span>}
      </p>
      <div className="flex gap-1">
        <button type="button" onClick={() => onChange(page - 1)} disabled={disabled || page === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 disabled:opacity-30">Prev</button>
        <button type="button" onClick={() => onChange(page + 1)} disabled={disabled || page >= totalPages - 1}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}
