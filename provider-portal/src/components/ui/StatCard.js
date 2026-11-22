const COLORS = {
  blue:   { bg: 'bg-secondary-100 dark:bg-secondary-800', icon: 'text-secondary-600 dark:text-secondary-300', ring: 'ring-secondary-100' },
  green:  { bg: 'bg-success-50 dark:bg-success-700/20', icon: 'text-success-600', ring: 'ring-success-100' },
  amber:  { bg: 'bg-warning-50 dark:bg-warning-700/20', icon: 'text-warning-600', ring: 'ring-warning-100' },
  rose:   { bg: 'bg-urgent-50 dark:bg-urgent-900/20', icon: 'text-urgent-600', ring: 'ring-urgent-100' },
  teal:   { bg: 'bg-primary-50 dark:bg-primary-900/20', icon: 'text-primary-600', ring: 'ring-primary-100' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600', ring: 'ring-purple-100' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', change, up, onClick, loading }) {
  const c = COLORS[color] || COLORS.blue;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-800 p-4 sm:p-5 shadow-sm ${onClick ? 'hover:border-primary-300 dark:hover:border-primary-700 transition' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-secondary-500 uppercase tracking-wider truncate">{title}</p>
          {loading
            ? <div className="h-7 w-12 mt-1.5 rounded-md bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
            : <p className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white mt-1">{value}</p>}
          {change && <p className={`text-xs font-medium mt-1 ${up ? 'text-success-600' : 'text-urgent-600'}`}>{change}</p>}
          {subtitle && <p className="text-xs text-secondary-400 mt-1 truncate">{subtitle}</p>}
        </div>
        {Icon && <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}><Icon className={c.icon} size={18} /></div>}
      </div>
    </Tag>
  );
}
