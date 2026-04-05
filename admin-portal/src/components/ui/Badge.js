const v = {
  success:  'bg-success-50 text-success-700 dark:bg-success-700/20 dark:text-success-400 ring-success-600/20',
  warning:  'bg-warning-50 text-warning-700 dark:bg-warning-700/20 dark:text-warning-400 ring-warning-600/20',
  danger:   'bg-urgent-50 text-urgent-600 dark:bg-urgent-700/20 dark:text-urgent-400 ring-urgent-600/20',
  info:     'bg-primary-50 text-primary-700 dark:bg-primary-700/20 dark:text-primary-400 ring-primary-600/20',
  gray:     'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300 ring-secondary-500/20',
  teal:     'bg-primary-50 text-primary-700 dark:bg-primary-700/20 dark:text-primary-300 ring-primary-600/20',
};

export default function Badge({ children, variant = 'gray', dot = false, size = 'sm' }) {
  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClass} font-medium rounded-full ring-1 ring-inset ${v[variant] || v.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${variant === 'success' ? 'bg-success-500' : variant === 'danger' ? 'bg-urgent-500' : variant === 'warning' ? 'bg-warning-500' : 'bg-primary-500'}`} />}
      {children}
    </span>
  );
}
