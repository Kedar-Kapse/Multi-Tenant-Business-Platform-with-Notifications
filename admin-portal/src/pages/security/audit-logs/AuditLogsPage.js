import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiShield, FiDownload, FiRefreshCw } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { auditApi } from '../../../services/securityService';
import { exportToCSV, exportToPDF, dataToHtmlTable } from '../../../utils/export';

const SEVERITY_OPTIONS = ['all', 'info', 'warning', 'critical'];
const ACTION_OPTIONS = ['all', 'login', 'logout', 'create', 'update', 'delete', 'access', 'export'];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [action, setAction] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditApi.getLogs({ severity: severity !== 'all' ? severity : undefined, action: action !== 'all' ? action : undefined });
      setLogs(Array.isArray(data) ? data : data?.content || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [severity, action]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return !q || [l.user, l.action, l.resource, l.ip, l.details].some((f) => f?.toLowerCase().includes(q));
  });

  const severityBadge = (s) => {
    const map = { info: 'info', warning: 'warning', critical: 'danger' };
    return <Badge variant={map[s?.toLowerCase()] || 'gray'} dot>{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-secondary-500 mt-0.5">HIPAA-compliant activity audit trail.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm transition">
            <FiRefreshCw size={14} /> Refresh
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm transition">
              <FiDownload size={14} /> Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 w-36 hidden group-hover:block z-10">
              <button onClick={() => exportToCSV(filtered, 'audit-logs', [{ key: 'timestamp', label: 'Timestamp' }, { key: 'user', label: 'User' }, { key: 'action', label: 'Action' }, { key: 'resource', label: 'Resource' }, { key: 'ip', label: 'IP' }, { key: 'severity', label: 'Severity' }, { key: 'details', label: 'Details' }])} className="w-full text-left px-3 py-2 text-xs text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700">Export CSV</button>
              <button onClick={() => exportToPDF('HIPAA Audit Logs', dataToHtmlTable(filtered, [{ key: 'timestamp', label: 'Timestamp' }, { key: 'user', label: 'User' }, { key: 'action', label: 'Action' }, { key: 'resource', label: 'Resource' }, { key: 'ip', label: 'IP' }, { key: 'severity', label: 'Severity' }]))} className="w-full text-left px-3 py-2 text-xs text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700">Export PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* HIPAA Notice */}
      <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 flex items-center gap-3">
        <FiShield className="text-primary-600 flex-shrink-0" size={16} />
        <p className="text-xs text-primary-700 dark:text-primary-400">All access to Protected Health Information (PHI) is logged per HIPAA §164.312(b). Logs are retained for 6 years and cannot be modified or deleted.</p>
      </div>

      <Card>
        <div className="p-4 border-b border-secondary-100 dark:border-secondary-700 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500">
            {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500">
            {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Timestamp</th>
                <th className="px-5 py-3 text-left font-medium">User</th>
                <th className="px-5 py-3 text-left font-medium">Action</th>
                <th className="px-5 py-3 text-left font-medium">Resource</th>
                <th className="px-5 py-3 text-left font-medium">IP Address</th>
                <th className="px-5 py-3 text-left font-medium">Severity</th>
                <th className="px-5 py-3 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-secondary-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-secondary-400">No audit logs found.</td></tr>
              ) : filtered.map((l, i) => (
                <tr key={l.id || i} className={`transition-colors ${l.severity === 'critical' ? 'bg-urgent-50/30 dark:bg-urgent-900/10' : 'hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30'}`}>
                  <td className="px-5 py-3 font-mono text-xs text-secondary-500 whitespace-nowrap">{l.timestamp || l.createdAt || '—'}</td>
                  <td className="px-5 py-3 font-medium text-secondary-900 dark:text-white">{l.user || l.username || '—'}</td>
                  <td className="px-5 py-3"><Badge variant="info">{l.action}</Badge></td>
                  <td className="px-5 py-3 text-secondary-600 dark:text-secondary-400 max-w-[200px] truncate">{l.resource || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-secondary-500">{l.ip || l.ipAddress || '—'}</td>
                  <td className="px-5 py-3">{severityBadge(l.severity)}</td>
                  <td className="px-5 py-3 text-xs text-secondary-500 max-w-[200px] truncate">{l.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
