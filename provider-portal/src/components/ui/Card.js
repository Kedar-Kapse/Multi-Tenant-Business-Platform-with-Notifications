export default function Card({ children, className = '' }) {
  return <div className={`bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-800 shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="px-4 sm:px-5 py-4 border-b border-secondary-100 dark:border-secondary-800 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-secondary-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
