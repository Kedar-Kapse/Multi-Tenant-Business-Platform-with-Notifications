const VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  danger:  'bg-urgent-50 text-urgent-700 dark:bg-urgent-900/30 dark:text-urgent-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  info:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  teal:    'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  gray:    'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400',
  purple:  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const DOT_COLORS = {
  success: 'bg-emerald-500', danger: 'bg-urgent-500', warning: 'bg-amber-500',
  info: 'bg-blue-500', teal: 'bg-teal-500', gray: 'bg-secondary-400', purple: 'bg-purple-500',
};

export default function Badge({ children, variant = 'gray', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${VARIANTS[variant] || VARIANTS.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[variant] || DOT_COLORS.gray}`} />}
      {children}
    </span>
  );
}
