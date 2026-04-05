import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ icon: Icon = FiInbox, title = 'No data', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-secondary-400" />
      </div>
      <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">{title}</h3>
      {description && <p className="text-xs text-secondary-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
