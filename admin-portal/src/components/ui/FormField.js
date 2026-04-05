import cn from '../../utils/cn';

/**
 * Reusable form field wrapper with label, error display, and variants.
 */
export default function FormField({ label, name, error, touched, required, children, className }) {
  const showError = touched && error;
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label htmlFor={name} className="block text-xs font-medium text-secondary-700 dark:text-secondary-300">
          {label} {required && <span className="text-urgent-500">*</span>}
        </label>
      )}
      {children}
      {showError && <p className="text-[11px] text-urgent-600 dark:text-urgent-400">{error}</p>}
    </div>
  );
}

/** Standard text input with form styling */
export function Input({ error, touched, className, ...props }) {
  return (
    <input
      {...props}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm outline-none transition',
        'bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white',
        'focus:ring-2 focus:ring-primary-500',
        touched && error
          ? 'border-urgent-300 dark:border-urgent-700'
          : 'border-secondary-200 dark:border-secondary-700',
        props.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    />
  );
}

/** Select dropdown with form styling */
export function Select({ options = [], placeholder, error, touched, className, ...props }) {
  return (
    <select
      {...props}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm outline-none transition',
        'bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white',
        'focus:ring-2 focus:ring-primary-500',
        touched && error
          ? 'border-urgent-300 dark:border-urgent-700'
          : 'border-secondary-200 dark:border-secondary-700',
        className
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  );
}

/** Textarea with form styling */
export function Textarea({ error, touched, className, ...props }) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm outline-none transition resize-y min-h-[80px]',
        'bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white',
        'focus:ring-2 focus:ring-primary-500',
        touched && error
          ? 'border-urgent-300 dark:border-urgent-700'
          : 'border-secondary-200 dark:border-secondary-700',
        className
      )}
    />
  );
}
