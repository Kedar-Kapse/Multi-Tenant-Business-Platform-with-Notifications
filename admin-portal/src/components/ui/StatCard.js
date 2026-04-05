import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

const iconBg = {
  teal:   'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  amber:  'bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
  rose:   'bg-urgent-50 text-urgent-600 dark:bg-urgent-900/30 dark:text-urgent-400',
  green:  'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400',
  slate:  'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400',
};

export default function StatCard({ title, value, change, up = true, icon: Icon, color = 'teal', subtitle }) {
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-5 shadow-card hover:shadow-card-hover transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-2 tracking-tight">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-success-600' : 'text-urgent-500'}`}>
                {up ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                {change}
              </span>
              <span className="text-xs text-secondary-400">{subtitle || 'vs last period'}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${iconBg[color]} group-hover:scale-110 transition-transform`}>
            <Icon className="text-xl" />
          </div>
        )}
      </div>
    </div>
  );
}
