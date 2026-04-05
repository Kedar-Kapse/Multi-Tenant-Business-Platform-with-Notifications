import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiDollarSign, FiClock, FiCheckCircle, FiXCircle, FiPlus, FiEdit2, FiX } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import { claimsApi } from '../../services/providerService';

const STATUS_OPTIONS = ['all', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'PAID', 'DENIED', 'APPEALED'];
const STATUS_BADGE = { SUBMITTED: 'info', IN_REVIEW: 'warning', APPROVED: 'teal', PAID: 'success', DENIED: 'danger', APPEALED: 'warning' };
const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

export default function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { setClaims(await claimsApi.getAll()); } catch { setClaims([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = claims.filter(c => {
    const q = search.toLowerCase();
    const ms = !q || [c.claimId, c.patientName, c.payerName, c.provider].some(f => f?.toLowerCase().includes(q));
    const mst = statusFilter === 'all' || c.status === statusFilter;
    return ms && mst;
  });

  const stats = { total: claims.length, pending: claims.filter(c => ['SUBMITTED', 'IN_REVIEW'].includes(c.status)).length, paid: claims.filter(c => c.status === 'PAID').length, denied: claims.filter(c => c.status === 'DENIED').length };

  const openSubmit = () => { setForm({ claimId: `CLM-${Date.now().toString().slice(-6)}`, patientName: '', payerName: '', provider: '', cptCode: '', icdCode: '', description: '', amount: '', dateSubmitted: new Date().toISOString().split('T')[0] }); setModalOpen(true); };

  const handleSubmit = async () => {
    if (!form.patientName?.trim() || !form.payerName?.trim() || !form.amount) { showToast('Patient, Payer, Amount required', 'error'); return; }
    setSaving(true);
    try { await claimsApi.submit({ ...form, amount: parseFloat(form.amount), status: 'SUBMITTED' }); showToast('Claim submitted'); setModalOpen(false); load(); }
    catch (e) { showToast(e?.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {toast && (<div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.msg}<button onClick={() => setToast(null)} className="hover:opacity-75"><FiX size={14} /></button></div>)}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">My Claims</h1><p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Track and submit insurance claims.</p></div>
        <button onClick={openSubmit} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto"><FiPlus size={16} /> Submit Claim</button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard title="Total" value={stats.total} icon={FiDollarSign} color="blue" />
        <StatCard title="Pending" value={stats.pending} icon={FiClock} color="amber" />
        <StatCard title="Paid" value={stats.paid} icon={FiCheckCircle} color="green" />
        <StatCard title="Denied" value={stats.denied} icon={FiXCircle} color="rose" />
      </div>

      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-700 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search claims..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All' : s.replace('_', ' ')}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Claim ID</th><th className="px-4 py-3 text-left">Patient</th><th className="px-4 py-3 text-left">Payer</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {loading ? <tr><td colSpan={6} className="px-4 py-12 text-center text-secondary-400">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-secondary-400">No claims found.</td></tr>
              : filtered.map(c => (
                <tr key={c.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                  <td className="px-4 py-3 font-mono font-semibold text-primary-600">{c.claimId}</td>
                  <td className="px-4 py-3">{c.patientName}</td>
                  <td className="px-4 py-3 text-xs text-secondary-500">{c.payerName}</td>
                  <td className="px-4 py-3 text-right font-semibold">{c.amount != null ? `₹${Number(c.amount).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-secondary-500">{c.dateSubmitted || '—'}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_BADGE[c.status] || 'gray'} dot>{c.status?.replace('_', ' ')}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Claim" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Claim ID</label><input value={form.claimId || ''} readOnly className={inputClass + ' bg-secondary-50'} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Date</label><input type="date" value={form.dateSubmitted || ''} onChange={e => set('dateSubmitted', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Patient *</label><input value={form.patientName || ''} onChange={e => set('patientName', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Payer *</label><input value={form.payerName || ''} onChange={e => set('payerName', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Provider</label><input value={form.provider || ''} onChange={e => set('provider', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Amount (₹) *</label><input type="number" value={form.amount || ''} onChange={e => set('amount', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">CPT Code</label><input value={form.cptCode || ''} onChange={e => set('cptCode', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">ICD Code</label><input value={form.icdCode || ''} onChange={e => set('icdCode', e.target.value)} className={inputClass} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">{saving ? 'Submitting...' : 'Submit Claim'}</button>
        </div>
      </Modal>
    </div>
  );
}
