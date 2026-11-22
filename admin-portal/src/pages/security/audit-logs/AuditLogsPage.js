import { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiShield, FiDownload, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Select from '../../../components/ui/Select';
import DatePicker from '../../../components/ui/DatePicker';
import EmptyState from '../../../components/ui/EmptyState';
import useDebounce from '../../../hooks/useDebounce';
import { auditApi } from '../../../services/securityService';
import { formatDateTime } from '../../../utils/formatters';
import { toast } from '../../../components/ui/Toast';

const PAGE_SIZE = 25;
const label = (s) => (s ? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');
const variantFor = (action = '') =>
  /DELETED|DISABLED|REVOKED/.test(action) ? 'danger' : /CREATED|SIGNUP|COMPLETE|ACTIVATED/.test(action) ? 'success' : /POLICY|PERMISSIONS|MFA/.test(action) ? 'warning' : 'info';

/** Who did what and when, in this hospital. */
export default function AuditLogsPage() {
  const [filters, setFilters] = useState({ action: '', entityType: '', from: '', to: '' });
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 350);
  const [options, setOptions] = useState({ actions: [], entityTypes: [] });
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, number: 0 });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    auditApi.getFilters().then(setOptions).catch(() => { /* filters stay empty; list still works */ });
  }, []);

  const params = useCallback((p) => ({
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    query: query || undefined,
    page: p,
    size: PAGE_SIZE,
  }), [filters, query]);

  const load = useCallback(async (p) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.getLogs(params(p));
      if (id === requestId.current) setData(res);
    } catch (e) {
      if (id === requestId.current) setError(e.response?.data?.message || 'Could not load the audit log.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [params]);

  // new filters -> first page
  useEffect(() => { setPage(0); load(0); }, [load]);

  const goTo = (p) => { setPage(p); load(p); };
  const setFilter = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await auditApi.export({ ...params(0), page: undefined, size: undefined });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error('Could not export the audit log');
    } finally {
      setExporting(false);
    }
  };

  const rows = data.content || [];
  const hasFilters = filters.action || filters.entityType || filters.from || filters.to || query;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-secondary-500 mt-0.5">Changes to staff, roles and security settings, and patient registrations.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(page)} disabled={loading} title="Refresh"
            className="p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-500 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition disabled:opacity-50">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCsv} disabled={exporting || data.totalElements === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm transition disabled:opacity-50">
            <FiDownload size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <Card>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search person, record, details…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <Select name="action" value={filters.action} onChange={setFilter} searchable
            options={[{ value: '', label: 'All actions' }, ...options.actions.map((a) => ({ value: a, label: label(a) }))]} />
          <Select name="entityType" value={filters.entityType} onChange={setFilter}
            options={[{ value: '', label: 'All record types' }, ...options.entityTypes.map((t) => ({ value: t, label: label(t) }))]} />
          <DatePicker name="from" value={filters.from} onChange={setFilter} max={filters.to || undefined} placeholder="From date" />
          <DatePicker name="to" value={filters.to} onChange={setFilter} min={filters.from || undefined} placeholder="To date" />
        </div>
      </Card>

      <Card>
        {error ? (
          <EmptyState icon={FiShield} title="Couldn't load the audit log" description={error}
            action={<button onClick={() => load(page)} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm">Try again</button>} />
        ) : !loading && rows.length === 0 ? (
          <EmptyState icon={FiShield} title="No audit entries" description={hasFilters ? 'Nothing matches these filters.' : 'Entries appear here when staff, roles or security settings change.'} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-secondary-400 border-b border-secondary-100 dark:border-secondary-700">
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Record</th>
                    <th className="px-4 py-3 font-semibold">By</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-secondary-100 dark:divide-secondary-700/50 ${loading ? 'opacity-50' : ''}`}>
                  {rows.map((a) => (
                    <tr key={a.id} className="hover:bg-secondary-50/60 dark:hover:bg-secondary-800/30">
                      <td className="px-4 py-3 whitespace-nowrap text-secondary-500 dark:text-secondary-400 text-xs">{formatDateTime(a.createdAt)}</td>
                      <td className="px-4 py-3"><Badge variant={variantFor(a.action)}>{label(a.action)}</Badge></td>
                      <td className="px-4 py-3 text-secondary-700 dark:text-secondary-200 max-w-[180px]">
                        <span className="text-[11px] text-secondary-400 block">{label(a.entityType)}</span>
                        <span className="truncate block" title={a.entityId}>{a.entityId}</span>
                      </td>
                      <td className="px-4 py-3 text-secondary-700 dark:text-secondary-200">{a.actorName || <span className="text-secondary-400">System / self-service</span>}</td>
                      <td className="px-4 py-3 text-secondary-500 dark:text-secondary-400 max-w-[320px]"><span className="line-clamp-2 break-words">{a.details || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className={`md:hidden divide-y divide-secondary-100 dark:divide-secondary-700/50 ${loading ? 'opacity-50' : ''}`}>
              {rows.map((a) => (
                <li key={a.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={variantFor(a.action)}>{label(a.action)}</Badge>
                    <span className="text-[11px] text-secondary-400">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p className="text-sm text-secondary-800 dark:text-secondary-100 break-words">{a.actorName || 'System / self-service'} · {label(a.entityType)}</p>
                  {a.details && <p className="text-xs text-secondary-500 break-words">{a.details}</p>}
                </li>
              ))}
            </ul>
            {loading && rows.length === 0 && <div className="p-10 text-center text-sm text-secondary-400">Loading…</div>}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-secondary-100 dark:border-secondary-700/50 text-xs text-secondary-500">
                <span>{data.totalElements} entries · page {page + 1} of {data.totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => goTo(page - 1)} disabled={page === 0 || loading} aria-label="Previous page"
                    className="p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 disabled:opacity-40 hover:bg-secondary-50 dark:hover:bg-secondary-800"><FiChevronLeft size={14} /></button>
                  <button onClick={() => goTo(page + 1)} disabled={page >= data.totalPages - 1 || loading} aria-label="Next page"
                    className="p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 disabled:opacity-40 hover:bg-secondary-50 dark:hover:bg-secondary-800"><FiChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
