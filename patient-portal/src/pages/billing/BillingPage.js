import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiDollarSign, FiClock, FiCheckCircle, FiAlertTriangle, FiInfo, FiFileText } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorState, SkeletonList } from '../../components/ui/States';
import { invoiceApi } from '../../services/patientService';
import { errorMessage, formatDate, formatMoney, humanize } from '../../utils/format';

const STATUS_BADGE = { PAID: 'success', PENDING: 'warning', OVERDUE: 'danger', PARTIALLY_PAID: 'info' };
const STATUS_LABEL = { PAID: 'Paid', PENDING: 'Unpaid', OVERDUE: 'Overdue', PARTIALLY_PAID: 'Partly paid' };
const amountDue = (i) => (i.status === 'PAID' ? 0 : Math.max(0, Number(i.amount || 0) - Number(i.paidAmount || 0)));

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('open');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [list, sum] = await Promise.allSettled([invoiceApi.mine(), invoiceApi.summary()]);
    if (list.status === 'fulfilled') setInvoices(Array.isArray(list.value) ? list.value : []);
    else setError(errorMessage(list.reason, 'Could not load your bills.'));
    setSummary(sum.status === 'fulfilled' ? sum.value : null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => ({
    due: invoices.reduce((s, i) => s + amountDue(i), 0),
    paid: invoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0),
  }), [invoices]);
  const counts = summary || {
    pending: invoices.filter((i) => i.status === 'PENDING').length,
    partiallyPaid: invoices.filter((i) => i.status === 'PARTIALLY_PAID').length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
  };
  const open = invoices.filter((i) => i.status !== 'PAID');
  const list = tab === 'open' ? open : tab === 'paid' ? invoices.filter((i) => i.status === 'PAID') : invoices;
  const busy = loading && !invoices.length;

  return (
    <div className="space-y-4">
      <PageHeader title="Billing" subtitle="Your invoices and what you still owe." />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
        <StatCard title="Amount due" value={formatMoney(totals.due)} icon={FiClock} color="warning" loading={busy} />
        <StatCard title="Paid so far" value={formatMoney(totals.paid)} icon={FiCheckCircle} color="success" loading={busy} />
        <StatCard title="Overdue" value={counts.overdue ?? 0} subtitle="invoices" icon={FiAlertTriangle} color={Number(counts.overdue) > 0 ? 'urgent' : 'neutral'} loading={busy} />
        <StatCard title="Open" value={(Number(counts.pending) || 0) + (Number(counts.partiallyPaid) || 0) + (Number(counts.overdue) || 0)} subtitle="invoices" icon={FiDollarSign} color="primary" loading={busy} />
      </div>

      <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200">
        <FiInfo size={16} className="flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm">Online payment isn't available yet — please pay at the hospital front desk. Your invoices update here once the payment is recorded.</p>
      </div>

      <Tabs
        tabs={[
          { key: 'open', label: 'To pay', count: open.length },
          { key: 'paid', label: 'Paid', count: invoices.length - open.length },
          { key: 'all', label: 'All', count: invoices.length },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      {error ? (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      ) : busy ? (
        <SkeletonList rows={3} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiFileText}
            title={tab === 'open' ? 'Nothing to pay' : tab === 'paid' ? 'No paid invoices yet' : 'No invoices yet'}
            description={tab === 'open' ? "You're all settled up." : 'Invoices from your visits will appear here.'}
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((inv) => <InvoiceCard key={inv.id} inv={inv} />)}
        </ul>
      )}
    </div>
  );
}

function InvoiceCard({ inv }) {
  const due = amountDue(inv);
  const paid = Number(inv.paidAmount || 0);
  const total = Number(inv.amount || 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <li>
      <Card>
        <div className="p-3.5 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-secondary-900 dark:text-white break-words">{inv.description || 'Invoice'}</p>
              <p className="text-xs text-secondary-500 mt-0.5 truncate">
                <span className="font-mono">{inv.invoiceNumber}</span>{inv.providerName ? ` · ${inv.providerName}` : ''}
              </p>
            </div>
            <Badge variant={STATUS_BADGE[inv.status] || 'gray'} dot>{STATUS_LABEL[inv.status] || humanize(inv.status)}</Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
            <div><p className="text-secondary-400">Total</p><p className="font-semibold text-secondary-900 dark:text-white">{formatMoney(total)}</p></div>
            <div>
              <p className="text-secondary-400">{inv.status === 'PAID' ? 'Paid' : 'Still to pay'}</p>
              <p className={`font-bold ${inv.status === 'PAID' ? 'text-success-600' : inv.status === 'OVERDUE' ? 'text-urgent-600' : 'text-secondary-900 dark:text-white'}`}>
                {formatMoney(inv.status === 'PAID' ? paid || total : due)}
              </p>
            </div>
            <div><p className="text-secondary-400">Issued</p><p className="text-secondary-700 dark:text-secondary-300">{formatDate(inv.issueDate)}</p></div>
            <div>
              <p className="text-secondary-400">{inv.status === 'PAID' ? 'Paid on' : 'Due by'}</p>
              <p className={inv.status === 'OVERDUE' ? 'text-urgent-600 font-medium' : 'text-secondary-700 dark:text-secondary-300'}>
                {formatDate(inv.status === 'PAID' ? inv.paidDate : inv.dueDate)}
              </p>
            </div>
          </div>

          {inv.status === 'PARTIALLY_PAID' && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-secondary-100 dark:bg-secondary-800 overflow-hidden"><div className="h-full bg-primary-500" style={{ width: `${pct}%` }} /></div>
              <p className="text-[11px] text-secondary-500 mt-1">{formatMoney(paid)} of {formatMoney(total)} paid</p>
            </div>
          )}
          {inv.status === 'PAID' && inv.paymentMethod && (
            <p className="text-[11px] text-secondary-400 mt-2">Paid by {humanize(inv.paymentMethod).toLowerCase()}</p>
          )}
        </div>
      </Card>
    </li>
  );
}
