import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiSearch, FiDollarSign, FiClock, FiCheckCircle, FiXCircle, FiPlus, FiEdit2, FiX, FiRefreshCw } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import DatePicker from '../../components/ui/DatePicker';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { ErrorState, Field, LoadingState, PageHeader, Spinner } from '../../components/ui/States';
import CodeSearch from '../../components/CodeSearch';
import { claimsApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';
import useDebounce from '../../hooks/useDebounce';
import { errorMessage } from '../../utils/errors';
import { CURRENCY_SYMBOL, formatDate, formatDateTime, formatMoney, titleCase, todayYmd } from '../../utils/format';
import { btnGhost, btnPrimary, btnSecondary, inputClass } from '../../utils/styles';

const STATUSES = ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'PAID', 'DENIED', 'APPEALED'];
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: titleCase(s) }));
const STATUS_BADGE = { SUBMITTED: 'info', IN_REVIEW: 'warning', APPROVED: 'teal', PAID: 'success', DENIED: 'danger', APPEALED: 'purple' };

const toForm = (c = {}) => ({
  patientName: c.patientName || '', patientId: c.patientId || '', payerName: c.payerName || '', provider: c.provider || '',
  cptCode: c.cptCode || '', icdCode: c.icdCode || '', description: c.description || '',
  amount: c.amount != null ? String(c.amount) : '', allowedAmount: c.allowedAmount != null ? String(c.allowedAmount) : '',
  paidAmount: c.paidAmount != null ? String(c.paidAmount) : '',
  dateSubmitted: c.dateSubmitted || todayYmd(), dateProcessed: c.dateProcessed || '',
  status: c.status || 'SUBMITTED', denialReason: c.denialReason || '',
});

const num = (v) => (v === '' || v == null ? null : Number(v));

export default function ClaimsPage() {
  const user = useAuthStore((s) => s.user);
  const [claims, setClaims] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim().toLowerCase(), 200);
  const [statusFilter, setStatusFilter] = useState('');

  const [detail, setDetail] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(toForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [list, sum] = await Promise.allSettled([claimsApi.getAll(), claimsApi.summary()]);
    if (list.status === 'fulfilled') setClaims(Array.isArray(list.value) ? list.value : []);
    else setLoadError(errorMessage(list.reason, 'Could not load claims.'));
    if (sum.status === 'fulfilled') setSummary(sum.value);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => claims.filter((c) => {
    const matches = !debounced || [c.claimId, c.patientName, c.payerName, c.provider, c.cptCode, c.icdCode]
      .some((f) => f && String(f).toLowerCase().includes(debounced));
    return matches && (!statusFilter || c.status === statusFilter);
  }), [claims, debounced, statusFilter]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const openSubmit = () => {
    setEditing(null);
    setForm({ ...toForm(), provider: user?.fullName || '' });
    setErrors({});
    setEditorOpen(true);
  };
  const openEdit = (c) => {
    setDetail(null);
    setEditing(c);
    setForm(toForm(c));
    setErrors({});
    setEditorOpen(true);
  };

  const openDetail = async (c) => {
    setDetail(c);
    try {
      const fresh = await claimsApi.getById(c.id);
      setDetail((d) => (d?.id === c.id ? fresh : d));
    } catch { /* keep the row we already have */ }
  };

  const validate = () => {
    const e = {};
    if (!form.patientName.trim()) e.patientName = 'Patient name is required';
    if (!form.payerName.trim()) e.payerName = 'Payer is required';
    if (form.amount === '' || Number.isNaN(Number(form.amount))) e.amount = 'Amount is required';
    else if (Number(form.amount) <= 0) e.amount = 'Amount must be greater than 0';
    ['allowedAmount', 'paidAmount'].forEach((k) => {
      if (form[k] !== '' && (Number.isNaN(Number(form[k])) || Number(form[k]) < 0)) e[k] = 'Cannot be negative';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    const base = {
      patientName: form.patientName.trim(), payerName: form.payerName.trim(), provider: form.provider.trim(),
      cptCode: form.cptCode, icdCode: form.icdCode, description: form.description.trim(),
      amount: num(form.amount), dateSubmitted: form.dateSubmitted || null,
    };
    try {
      if (editing) {
        await claimsApi.update(editing.id, {
          ...base,
          patientId: form.patientId.trim(),
          status: form.status,
          allowedAmount: num(form.allowedAmount),
          paidAmount: num(form.paidAmount),
          denialReason: form.denialReason.trim(),
          dateProcessed: form.dateProcessed || null,
        });
        toast.success(`Claim ${editing.claimId} updated`);
      } else {
        const created = await claimsApi.submit({ ...base, ...(form.patientId.trim() ? { patientId: form.patientId.trim() } : {}) });
        toast.success(`Claim ${created?.claimId || ''} submitted`);
      }
      setEditorOpen(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the claim.'));
    } finally {
      setSaving(false);
    }
  };

  const s = summary || {};
  const pending = (s.submitted || 0) + (s.inReview || 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Claims"
        subtitle="Insurance claims for the hospital."
        actions={(
          <>
            <button type="button" onClick={load} aria-label="Refresh" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400"><FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
            <button type="button" onClick={openSubmit} className={`${btnPrimary} flex-1 sm:flex-none`}><FiPlus size={16} /> Submit claim</button>
          </>
        )}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard title="Total" value={summary ? s.total : '—'} icon={FiDollarSign} color="blue" loading={loading && !summary} />
        <StatCard title="Pending" value={summary ? pending : '—'} subtitle="submitted or in review" icon={FiClock} color="amber" loading={loading && !summary} />
        <StatCard title="Paid" value={summary ? s.paid : '—'} subtitle={summary ? `${s.approved || 0} approved` : ''} icon={FiCheckCircle} color="green" loading={loading && !summary} onClick={() => setStatusFilter('PAID')} />
        <StatCard title="Denied" value={summary ? s.denied : '—'} subtitle={summary ? `${s.appealed || 0} appealed` : ''} icon={FiXCircle} color="rose" loading={loading && !summary} onClick={() => setStatusFilter('DENIED')} />
      </div>

      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-800 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search claim, patient, payer or code…" aria-label="Search claims" className={`${inputClass} pl-9 pr-8`} />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-secondary-400 hover:text-secondary-600"><FiX size={13} /></button>}
          </div>
          <div className="sm:w-48">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} aria-label="Status filter" />
          </div>
        </div>

        {loadError ? <ErrorState title="Could not load claims" message={loadError} onRetry={load} />
          : loading && claims.length === 0 ? <LoadingState />
            : filtered.length === 0 ? (
              <EmptyState icon={FiDollarSign} title={claims.length ? 'No claims match' : 'No claims yet'}
                description={claims.length ? 'Try another search or status.' : 'Submitted claims will appear here.'}
                action={claims.length ? <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); }} className={btnSecondary}>Clear filters</button> : null} />
            ) : (
              <>
                {/* Phones: cards */}
                <ul className="sm:hidden divide-y divide-secondary-100 dark:divide-secondary-800">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => openDetail(c)} className="w-full text-left px-4 py-3 hover:bg-secondary-50 dark:hover:bg-secondary-800/40">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300 truncate">{c.claimId}</span>
                          <Badge variant={STATUS_BADGE[c.status] || 'gray'} dot>{titleCase(c.status)}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-sm font-medium text-secondary-900 dark:text-white truncate">{c.patientName}</span>
                          <span className="text-sm font-semibold text-secondary-900 dark:text-white flex-shrink-0">{formatMoney(c.amount)}</span>
                        </div>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate mt-0.5">{c.payerName} · {formatDate(c.dateSubmitted) || '—'}</p>
                      </button>
                    </li>
                  ))}
                </ul>
                {/* Tablet and up: table */}
                <div className="hidden sm:block relative overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 dark:text-secondary-400 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left font-semibold">Claim</th>
                        <th className="px-4 py-3 text-left font-semibold">Patient</th>
                        <th className="px-4 py-3 text-left font-semibold">Payer</th>
                        <th className="px-4 py-3 text-right font-semibold">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-2 py-3"><span className="sr-only">Edit</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                      {filtered.map((c) => (
                        <tr key={c.id} onClick={() => openDetail(c)} className="cursor-pointer hover:bg-secondary-50/60 dark:hover:bg-secondary-800/30 text-secondary-800 dark:text-secondary-200">
                          <td className="px-4 py-3 font-mono font-semibold text-primary-700 dark:text-primary-300 whitespace-nowrap">{c.claimId}</td>
                          <td className="px-4 py-3 max-w-[180px] truncate">{c.patientName}</td>
                          <td className="px-4 py-3 text-xs text-secondary-500 dark:text-secondary-400 max-w-[180px] truncate">{c.payerName}</td>
                          <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatMoney(c.amount)}</td>
                          <td className="px-4 py-3 text-xs text-secondary-500 dark:text-secondary-400 whitespace-nowrap">{formatDate(c.dateSubmitted) || '—'}</td>
                          <td className="px-4 py-3"><Badge variant={STATUS_BADGE[c.status] || 'gray'} dot>{titleCase(c.status)}</Badge></td>
                          <td className="px-2 py-3 text-right">
                            <button type="button" aria-label={`Edit ${c.claimId}`} onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                              className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"><FiEdit2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
      </Card>

      {/* Detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Claim ${detail.claimId}` : 'Claim'}
        size="md"
        footer={detail && (
          <>
            <button type="button" onClick={() => setDetail(null)} className={btnGhost}>Close</button>
            <button type="button" onClick={() => openEdit(detail)} className={btnPrimary}><FiEdit2 size={14} /> Edit</button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={STATUS_BADGE[detail.status] || 'gray'} dot>{titleCase(detail.status)}</Badge>
              <span className="text-lg font-bold text-secondary-900 dark:text-white">{formatMoney(detail.amount)}</span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Patient', detail.patientName], ['Patient ID', detail.patientId], ['Payer', detail.payerName], ['Provider', detail.provider],
                ['CPT', detail.cptCode], ['ICD-10', detail.icdCode], ['Allowed', detail.allowedAmount != null ? formatMoney(detail.allowedAmount) : null],
                ['Paid', detail.paidAmount != null ? formatMoney(detail.paidAmount) : null], ['Submitted', formatDate(detail.dateSubmitted)],
                ['Processed', formatDate(detail.dateProcessed)],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[11px] text-secondary-400">{k}</dt>
                  <dd className="font-medium text-secondary-900 dark:text-white break-words">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            {detail.description && <p className="text-sm text-secondary-700 dark:text-secondary-300 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-800 break-words">{detail.description}</p>}
            {detail.denialReason && <p className="text-sm text-urgent-700 dark:text-urgent-300 p-3 rounded-xl bg-urgent-50 dark:bg-urgent-900/20 break-words">Denied: {detail.denialReason}</p>}
            <p className="text-[11px] text-secondary-400">Last updated {formatDateTime(detail.updatedAt)}</p>
          </div>
        )}
      </Modal>

      {/* Submit / edit */}
      <Modal
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        title={editing ? `Edit claim ${editing.claimId}` : 'Submit claim'}
        size="lg"
        footer={(
          <>
            <button type="button" onClick={() => setEditorOpen(false)} disabled={saving} className={btnGhost}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving ? <><Spinner size="sm" className="border-white border-t-transparent" /> Saving…</> : editing ? 'Save changes' : 'Submit claim'}
            </button>
          </>
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!editing && <p className="sm:col-span-2 text-xs text-secondary-400">The claim number is assigned automatically when you submit.</p>}
          <Field label="Patient name" required error={errors.patientName}>
            <input value={form.patientName} onChange={(e) => set('patientName', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Patient ID / MRN">
            <input value={form.patientId} onChange={(e) => set('patientId', e.target.value)} className={inputClass} placeholder="Optional" />
          </Field>
          <Field label="Payer" required error={errors.payerName}>
            <input value={form.payerName} onChange={(e) => set('payerName', e.target.value)} className={inputClass} placeholder="Insurance company" />
          </Field>
          <Field label="Provider">
            <input value={form.provider} onChange={(e) => set('provider', e.target.value)} className={inputClass} />
          </Field>
          <Field label={`Billed amount (${CURRENCY_SYMBOL})`} required error={errors.amount}>
            <input type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Date submitted">
            <DatePicker name="dateSubmitted" value={form.dateSubmitted} onChange={(e) => set('dateSubmitted', e.target.value)} max={todayYmd()} />
          </Field>
          <Field label="CPT code">
            <CodeSearch kind="cpt" value={form.cptCode} onChange={(v) => set('cptCode', v)} />
          </Field>
          <Field label="ICD-10 code">
            <CodeSearch kind="icd" value={form.icdCode} onChange={(v) => set('icdCode', v)} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </Field>

          {editing && (
            <>
              <div className="sm:col-span-2 border-t border-secondary-100 dark:border-secondary-800 pt-3">
                <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">Processing</p>
              </div>
              <Field label="Status">
                <Select name="status" value={form.status} onChange={(e) => set('status', e.target.value)} options={STATUS_OPTIONS} />
              </Field>
              <Field label="Date processed">
                <DatePicker name="dateProcessed" value={form.dateProcessed} onChange={(e) => set('dateProcessed', e.target.value)} max={todayYmd()} />
              </Field>
              <Field label={`Allowed amount (${CURRENCY_SYMBOL})`} error={errors.allowedAmount}>
                <input type="number" inputMode="decimal" min="0" step="0.01" value={form.allowedAmount} onChange={(e) => set('allowedAmount', e.target.value)} className={inputClass} />
              </Field>
              <Field label={`Paid amount (${CURRENCY_SYMBOL})`} error={errors.paidAmount}>
                <input type="number" inputMode="decimal" min="0" step="0.01" value={form.paidAmount} onChange={(e) => set('paidAmount', e.target.value)} className={inputClass} />
              </Field>
              {(form.status === 'DENIED' || form.status === 'APPEALED' || form.denialReason) && (
                <Field label="Denial reason" className="sm:col-span-2">
                  <input value={form.denialReason} onChange={(e) => set('denialReason', e.target.value)} className={inputClass} />
                </Field>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
