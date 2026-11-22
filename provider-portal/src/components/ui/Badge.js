const VARIANTS = {
  success: 'bg-success-50 text-success-700 dark:bg-success-700/20 dark:text-success-400',
  danger:  'bg-urgent-50 text-urgent-700 dark:bg-urgent-900/30 dark:text-urgent-400',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-700/20 dark:text-warning-400',
  info:    'bg-secondary-100 text-secondary-700 dark:bg-secondary-700/60 dark:text-secondary-200',
  teal:    'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  gray:    'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400',
  purple:  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const DOT_COLORS = {
  success: 'bg-success-500', danger: 'bg-urgent-500', warning: 'bg-warning-500',
  info: 'bg-secondary-500', teal: 'bg-primary-500', gray: 'bg-secondary-400', purple: 'bg-purple-500',
};

export default function Badge({ children, variant = 'gray', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${VARIANTS[variant] || VARIANTS.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[variant] || DOT_COLORS.gray}`} />}
      {children}
    </span>
  );
}
