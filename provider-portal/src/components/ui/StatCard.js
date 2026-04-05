const COLORS = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600', ring: 'ring-blue-100' },
  green:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600', ring: 'ring-amber-100' },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-900/20', icon: 'text-rose-600', ring: 'ring-rose-100' },
  teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20', icon: 'text-teal-600', ring: 'ring-teal-100' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600', ring: 'ring-purple-100' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', change, up }) {
  const c = COLORS[color] || COLORS.blue;
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-800 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-secondary-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{value}</p>
          {change && <p className={`text-xs font-medium mt-1 ${up ? 'text-emerald-600' : 'text-rose-600'}`}>{change}</p>}
          {subtitle && <p className="text-xs text-secondary-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}><Icon className={c.icon} size={20} /></div>}
      </div>
    </div>
  );
}
