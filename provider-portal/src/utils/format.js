// Dates are handled as LOCAL calendar dates ("YYYY-MM-DD"), never via toISOString()
// (which converts to UTC and can shift the day for users east/west of UTC).

const pad = (n) => String(n).padStart(2, '0');

export const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseYmd = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

export const todayYmd = () => toYmd(new Date());

export const addDays = (d, n) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};

/** Monday of the week containing `d` (Sunday belongs to the week that started the Monday before). */
export const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7));

/** "HH:mm" from "HH:mm:ss" / "HH:mm". */
export const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

/** "14:30" -> "2:30 PM" */
export const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return '';
  return `${((h + 11) % 12) + 1}:${pad(m || 0)} ${h < 12 ? 'AM' : 'PM'}`;
};

export const formatDate = (ymdOrIso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!ymdOrIso) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymdOrIso) ? parseYmd(ymdOrIso) : new Date(ymdOrIso);
  return Number.isNaN(d?.getTime?.()) ? '' : d.toLocaleDateString(undefined, opts);
};

export const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString();
};

/** One currency for the whole portal (the hospital bills in INR). */
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const formatMoney = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? '—' : money.format(Number(v)));
export const CURRENCY_SYMBOL = '₹';

export const initials = (first, last) => `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase() || '?';
export const initialsOf = (name) => (name || '').split(/\s+/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

export const titleCase = (s) => (s ? String(s).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

export const fullName = (p) => `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
