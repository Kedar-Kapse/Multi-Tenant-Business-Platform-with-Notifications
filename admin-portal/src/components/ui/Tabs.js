import cn from '../../utils/cn';

/**
 * Reusable tab switcher component.
 * @param {Array<{key, label, icon?}>} tabs - Tab definitions
 * @param {string} activeKey - Currently active tab key
 * @param {Function} onChange - Callback when tab changes
 */
export default function Tabs({ tabs, activeKey, onChange, className }) {
  return (
    <div className={cn('flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl p-1 w-fit', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              active
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
            )}
          >
            {Icon && <Icon size={14} />}
            {tab.label}
            {tab.count != null && (
              <span className={cn(
                'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                active ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-secondary-200 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
