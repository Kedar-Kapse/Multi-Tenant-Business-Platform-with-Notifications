/** Currency formatter */
export const formatCurrency = (value, currency = 'USD') => {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
};

/** Compact number formatter (1200 → 1.2K) */
export const formatCompact = (value) => {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

/** Date formatter */
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', { ...defaults, ...options }).format(d);
};

/** DateTime formatter */
export const formatDateTime = (date) =>
  formatDate(date, { hour: '2-digit', minute: '2-digit', hour12: true });

/** Relative time (e.g. "3 min ago") */
export const formatRelativeTime = (date) => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
};

/** Phone number formatter */
export const formatPhone = (phone) => {
  if (!phone) return '—';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  if (cleaned.length === 11) return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  return phone;
};

/** Percentage formatter */
export const formatPercent = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return '—';
  return `${Number(value).toFixed(decimals)}%`;
};

/** Truncate text */
export const truncate = (str, length = 50) => {
  if (!str) return '';
  return str.length > length ? `${str.slice(0, length)}…` : str;
};

/** Capitalize first letter */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/** Title case */
export const titleCase = (str) => {
  if (!str) return '';
  return str.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};
