/** Conditionally join class names — lightweight clsx alternative */
export default function cn(...args) {
  return args
    .flat()
    .filter((a) => typeof a === 'string' && a.trim())
    .join(' ');
}
