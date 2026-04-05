export default function Card({ children, className = '', hover = false }) {
  return (
    <div className={`bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 shadow-card ${hover ? 'hover:shadow-card-hover transition-shadow' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b border-secondary-100 dark:border-secondary-700 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-secondary-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
