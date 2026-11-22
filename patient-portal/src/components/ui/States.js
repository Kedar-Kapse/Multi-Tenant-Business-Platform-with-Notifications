import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

export function Spinner({ size = 'md', className = '' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2';
  return <span className={`inline-block ${s} border-current border-t-transparent rounded-full animate-spin ${className}`} aria-hidden="true" />;
}

export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 text-secondary-400 ${className}`} role="status">
      <Spinner className="text-primary-500" />
      <p className="text-xs mt-3">{label}</p>
    </div>
  );
}

/** Shown when a request failed -- never pretend there is "no data". */
export function ErrorState({ title = "Couldn't load this", message, onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 px-4 text-center ${className}`} role="alert">
      <div className="w-12 h-12 rounded-2xl bg-urgent-50 dark:bg-urgent-900/20 flex items-center justify-center mb-3">
        <FiAlertCircle className="text-urgent-600 dark:text-urgent-400" size={22} />
      </div>
      <h3 className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">{title}</h3>
      {message && <p className="text-xs text-secondary-500 mt-1 max-w-sm break-words">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition">
          <FiRefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

/** Skeleton rows for lists. */
export function SkeletonList({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 animate-pulse" />
      ))}
    </div>
  );
}
