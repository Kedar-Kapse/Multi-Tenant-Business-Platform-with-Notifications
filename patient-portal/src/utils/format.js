// Shared formatting helpers. Keep every page on the same date / money / label rules.

const LOCALE = 'en-IN';
const pad = (n) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" -> local Date (no UTC shift, unlike new Date('YYYY-MM-DD')). */
export function parseLocalDate(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Today's date as "YYYY-MM-DD" in the browser's time zone. */
export function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Server timestamps (LocalDateTime, e.g. "2026-11-22T11:36:34.807") carry no zone.
 * The services run in UTC, so a zone-less timestamp is read as UTC.
 */
export function parseServerDateTime(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const str = String(s);
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(str);
  const d = new Date(hasZone ? str : `${str}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(ymd, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = parseLocalDate(ymd);
  return d ? d.toLocaleDateString(LOCALE, opts) : '—';
}

export function formatDateLong(ymd) {
  return formatDate(ymd, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Parts for a calendar "chip": { month: 'Nov', day: 27, weekday: 'Fri' }. */
export function dateChip(ymd) {
  const d = parseLocalDate(ymd);
  if (!d) return { month: '—', day: '', weekday: '' };
  return {
    month: d.toLocaleDateString(LOCALE, { month: 'short' }),
    day: d.getDate(),
    weekday: d.toLocaleDateString(LOCALE, { weekday: 'short' }),
  };
}

/** "14:30" or "14:30:00" -> "2:30 PM". */
export function formatTime(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatDateTime(serverTs) {
  const d = parseServerDateTime(serverTs);
  return d
    ? d.toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';
}

export function formatServerDate(serverTs) {
  const d = parseServerDateTime(serverTs);
  return d ? d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function relativeTime(serverTs) {
  const d = parseServerDateTime(serverTs);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMoney(v) {
  const n = Number(v || 0);
  return `₹${n.toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatFileSize(bytes) {
  const b = Number(bytes);
  if (!b) return '—';
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

/** "FOLLOW_UP" -> "Follow up". */
export function humanize(v) {
  if (!v) return '';
  const s = String(v).replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initials(first, last) {
  const s = `${(first || '').trim()[0] || ''}${(last || '').trim()[0] || ''}`.toUpperCase();
  return s || '?';
}

export function initialsFromName(name) {
  const parts = String(name || '').replace(/^dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  return initials(parts[0], parts.length > 1 ? parts[parts.length - 1] : '');
}

/** Message from the backend error JSON ({status, error, message, fieldErrors}). */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data;
  if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
    const first = Object.entries(data.fieldErrors)[0];
    if (first) return `${humanize(first[0])}: ${first[1]}`;
  }
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (!err?.response && err?.message === 'Network Error') return 'Cannot reach the server. Check your connection and try again.';
  return fallback;
}
