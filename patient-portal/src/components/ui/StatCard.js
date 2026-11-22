const COLORS = {
  primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', icon: 'text-primary-600 dark:text-primary-400' },
  success: { bg: 'bg-success-50 dark:bg-success-700/20', icon: 'text-success-600 dark:text-success-400' },
  warning: { bg: 'bg-warning-50 dark:bg-warning-700/20', icon: 'text-warning-600 dark:text-warning-400' },
  urgent:  { bg: 'bg-urgent-50 dark:bg-urgent-900/20', icon: 'text-urgent-600 dark:text-urgent-400' },
  neutral: { bg: 'bg-secondary-100 dark:bg-secondary-800', icon: 'text-secondary-600 dark:text-secondary-300' },
};
// Older color names used across pages.
const ALIASES = { blue: 'primary', teal: 'primary', green: 'success', amber: 'warning', rose: 'urgent', purple: 'neutral' };

/** Compact on phones (2 per row fits at 375px), roomier from `sm`. */
export default function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', loading = false, onClick }) {
  const c = COLORS[ALIASES[color] || color] || COLORS.primary;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left min-w-0 bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-800 p-3.5 sm:p-5 shadow-sm ${onClick ? 'hover:border-primary-300 dark:hover:border-primary-700 transition' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-medium text-secondary-500 uppercase tracking-wide truncate">{title}</p>
          {loading
            ? <div className="h-7 w-16 mt-1.5 rounded-md bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
            : <p className="text-lg sm:text-2xl font-bold text-secondary-900 dark:text-white mt-1 truncate">{value}</p>}
          {subtitle && <p className="text-[11px] sm:text-xs text-secondary-400 mt-1 truncate">{subtitle}</p>}
        </div>
        {Icon && <div className={`hidden min-[400px]:flex w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${c.bg} items-center justify-center flex-shrink-0`}><Icon className={c.icon} size={18} /></div>}
      </div>
    </Tag>
  );
}
