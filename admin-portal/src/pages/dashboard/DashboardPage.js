import { useState, useEffect, useCallback, useRef } from 'react';
import { FiUsers, FiDollarSign, FiActivity, FiAlertCircle, FiArrowRight, FiDownload, FiRefreshCw, FiShield, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import useAuthStore from '../../store/authStore';
import dashboardService from '../../services/dashboardService';
import { formatMoneyCompact, formatCurrency, formatPercent, formatDate, LOCALE } from '../../utils/formatters';
import { exportToCSV, exportToPDF, dataToHtmlTable } from '../../utils/export';
import { toast } from '../../components/ui/Toast';

const TOOLTIP = { backgroundColor: '#0f172a', border: 'none', borderRadius: 12, fontSize: 12, color: '#fff' };

/** "+12.5%" or null when there is nothing to compare with. */
const changeText = (v) => (v == null ? null : `${v > 0 ? '+' : ''}${v}%`);

function OccupancyBar({ ward, occupied, total, occupancy }) {
  const color = occupancy > 80 ? 'bg-urgent-500' : occupancy > 60 ? 'bg-warning-500' : 'bg-primary-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-secondary-500 w-20 sm:w-24 text-right truncate" title={ward}>{ward}</span>
      <div className="flex-1 bg-secondary-100 dark:bg-secondary-700 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${occupancy}%` }} />
      </div>
      <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 whitespace-nowrap">{occupied}/{total} <span className="text-secondary-400">({occupancy}%)</span></span>
    </div>
  );
}

/** Small card body for a section that failed or has no data yet. */
const Blank = ({ text }) => <p className="px-5 py-8 text-center text-xs text-secondary-400">{text}</p>;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const [kpis, setKpis] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [claimStatus, setClaimStatus] = useState(null);
  const [bedOccupancy, setBedOccupancy] = useState(null);
  const [posture, setPosture] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const parts = [
      ['kpis', dashboardService.getKpis, setKpis],
      ['revenue', dashboardService.getRevenueTrend, setRevenueData],
      ['claims', dashboardService.getClaimsDistribution, setClaimStatus],
      ['beds', dashboardService.getBedOccupancy, setBedOccupancy],
      ['security', dashboardService.getSecurityPosture, setPosture],
      ['alerts', dashboardService.getRecentAlerts, setAlerts],
    ];
    const results = await Promise.allSettled(parts.map(([, fn]) => fn()));
    const bad = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') parts[i][2](r.value);
      else bad.push(parts[i][0]);
    });
    setFailed(bad);
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (!exportOpen) return undefined;
    const close = (e) => { if (!exportRef.current?.contains(e.target)) setExportOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, [exportOpen]);

  const exportCols = [{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Paid revenue' }, { key: 'claims', label: 'Claims submitted' }];
  const doExport = (kind) => {
    setExportOpen(false);
    if (!revenueData?.length) { toast.info('Nothing to export yet'); return; }
    if (kind === 'csv') exportToCSV(revenueData, 'revenue-trend', exportCols);
    else exportToPDF('Revenue Report', dataToHtmlTable(revenueData, exportCols));
  };

  const k = kpis || {};
  const dash = loading && !kpis ? '…' : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white tracking-tight truncate">{greeting}, {user?.username || 'Admin'}</h1>
          <p className="text-sm text-secondary-500 mt-0.5">Your hospital at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary-400 hidden sm:inline">{new Date().toLocaleDateString(LOCALE, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <button onClick={loadDashboard} className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition" title="Refresh">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative" ref={exportRef}>
            <button onClick={() => setExportOpen((o) => !o)} aria-expanded={exportOpen} className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition" title="Export">
              <FiDownload size={14} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 w-40 z-20 animate-[fadeIn_.12s_ease-out]">
                <button onClick={() => doExport('csv')} className="w-full text-left px-3 py-2 text-xs text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700">Export as CSV</button>
                <button onClick={() => doExport('pdf')} className="w-full text-left px-3 py-2 text-xs text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700">Export as PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {failed.length > 0 && !loading && (
        <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-warning-700 dark:text-warning-400">Some sections couldn't load ({failed.join(', ')}).</p>
          <button onClick={loadDashboard} className="text-xs font-medium text-warning-700 dark:text-warning-400 underline">Try again</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Appointments (month)" value={kpis ? Number(k.patientVolume).toLocaleString(LOCALE) : dash}
          change={changeText(k.patientChange)} up={k.patientChange > 0} icon={FiUsers} color="teal" subtitle={k.patientChange == null && kpis ? 'vs last month: no data' : 'vs last month'} />
        <StatCard title="Revenue (month)" value={kpis ? formatMoneyCompact(k.revenueMtd) : dash}
          change={changeText(k.revenueChange)} up={k.revenueChange > 0} icon={FiDollarSign} color="green" subtitle="paid claims" />
        <StatCard title="Bed Occupancy" value={kpis ? (k.bedOccupancy == null ? 'No beds' : formatPercent(k.bedOccupancy)) : dash}
          icon={FiActivity} color="amber" subtitle={kpis && k.bedsTotal ? `${k.bedsOccupied} of ${k.bedsTotal} beds` : undefined} />
        <StatCard title="No-Show Rate" value={kpis ? (k.noShowRate == null ? '—' : formatPercent(k.noShowRate)) : dash}
          change={changeText(k.noShowChange)} up={k.noShowChange < 0} icon={FiAlertCircle} color="rose" subtitle="last 30 days" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue Trend" subtitle="Paid revenue and claims submitted, last 6 months" action={
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary-500" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success-500" /> Claims</span>
            </div>
          } />
          {revenueData?.length ? (
            <div className="p-3 sm:p-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                  <YAxis yAxisId="money" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} width={56} tickFormatter={(v) => formatMoneyCompact(v)} />
                  <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} width={28} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v, name) => [name === 'revenue' ? formatCurrency(v) : v, name === 'revenue' ? 'Revenue' : 'Claims']} />
                  <Area yAxisId="money" type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fill="url(#gRevenue)" />
                  <Area yAxisId="count" type="monotone" dataKey="claims" stroke="#16a34a" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <Blank text={loading ? 'Loading…' : 'No revenue data yet.'} />}
        </Card>

        <Card>
          <CardHeader title="Claims by Status" subtitle="All claims" />
          {claimStatus?.length ? (
            <div className="p-5 flex flex-col items-center">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={claimStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
                      {claimStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} formatter={(v, n, p) => [`${v} (${p.payload.percent}%)`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full">
                {claimStatus.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-secondary-500 truncate capitalize">{s.name.toLowerCase()}</span>
                    <span className="text-xs font-semibold text-secondary-900 dark:text-white ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <Blank text={loading ? 'Loading…' : 'No claims yet.'} />}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Bed Occupancy" subtitle="By ward, right now" />
          {bedOccupancy?.length ? (
            <div className="p-5 space-y-3">{bedOccupancy.map((b) => <OccupancyBar key={b.ward} {...b} />)}</div>
          ) : <Blank text={loading ? 'Loading…' : 'No beds set up yet (Inventory & Facility).'} />}
        </Card>

        <Card>
          <CardHeader title="Security Score" subtitle="From your real sign-in and password settings" action={
            posture && <Badge variant={posture.score >= 80 ? 'success' : posture.score >= 50 ? 'warning' : 'danger'} dot>{posture.score}%</Badge>
          } />
          {posture ? (
            <ul className="p-5 space-y-2.5">
              {posture.checks.map((c) => (
                <li key={c.name} className="flex items-start gap-2.5">
                  {c.passed ? <FiCheckCircle className="text-success-600 mt-0.5 flex-shrink-0" size={14} /> : <FiXCircle className="text-urgent-500 mt-0.5 flex-shrink-0" size={14} />}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-secondary-800 dark:text-secondary-200">{c.name} <span className="font-normal text-secondary-400">· {c.detail}</span></p>
                    {c.recommendation && <p className="text-[11px] text-secondary-500 mt-0.5">{c.recommendation}</p>}
                  </div>
                </li>
              ))}
              <li className="pt-1">
                <button onClick={() => navigate('/settings')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"><FiShield size={12} /> Security settings <FiArrowRight size={12} /></button>
              </li>
            </ul>
          ) : <Blank text={loading ? 'Loading…' : 'Security score unavailable.'} />}
        </Card>

        <Card>
          <CardHeader title="Alerts" subtitle="Overdue bills and low stock" />
          {alerts?.length ? (
            <ul className="divide-y divide-secondary-50 dark:divide-secondary-700/50">
              {alerts.map((a) => (
                <li key={a.id} className="px-5 py-3 flex gap-3">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${a.severity === 'danger' ? 'bg-urgent-500' : 'bg-warning-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-secondary-700 dark:text-secondary-300 leading-relaxed break-words">
                      {a.msg}{a.amountDue != null && <> · {formatCurrency(a.amountDue)} due</>}
                    </p>
                    <p className="text-[10px] text-secondary-400 mt-0.5">{a.type === 'INVOICE_OVERDUE' ? `Due ${formatDate(a.date)}` : formatDate(a.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={FiCheckCircle} title={loading ? 'Loading…' : 'No alerts'} description={loading ? undefined : 'No overdue bills or low stock.'} />}
        </Card>
      </div>
    </div>
  );
}
