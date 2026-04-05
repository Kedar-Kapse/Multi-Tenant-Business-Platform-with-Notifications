import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiFilter, FiDollarSign, FiClock, FiCheckCircle, FiXCircle, FiRefreshCw, FiDownload, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import StatCard from '../../../components/ui/StatCard';
import Modal from '../../../components/ui/Modal';
import { claimsApi } from '../../../services/financialService';
import { exportToCSV, exportToPDF, dataToHtmlTable } from '../../../utils/export';

const STATUS_OPTIONS = ['all', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'PAID', 'DENIED', 'APPEALED'];
const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

const emptyClaim = { claimId: '', patientName: '', patientId: '', payerName: '', provider: '', cptCode: '', icdCode: '', description: '', amount: '', status: 'SUBMITTED', dateSubmitted: new Date().toISOString().split('T')[0] };

export default function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClaim);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await claimsApi.getAll(); setClaims(Array.isArray(data) ? data : data?.content || []); }
    catch { setClaims([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = claims.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [c.claimId, c.patientName, c.payerName, c.provider].some((f) => f?.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: claims.length,
    pending: claims.filter(c => ['SUBMITTED', 'IN_REVIEW'].includes(c.status)).length,
    paid: claims.filter(c => c.status === 'PAID').length,
    denied: claims.filter(c => c.status === 'DENIED').length,
  };

  const statusBadge = (s) => {
    const map = { SUBMITTED: 'info', IN_REVIEW: 'warning', APPROVED: 'teal', PAID: 'success', DENIED: 'danger', APPEALED: 'warning' };
    return <Badge variant={map[s] || 'gray'} dot>{s?.replace('_', ' ')}</Badge>;
  };

  const formatCurrency = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

  const openCreate = () => { setEditing(null); setForm(emptyClaim); setModalOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ claimId: c.claimId, patientName: c.patientName, patientId: c.patientId || '', payerName: c.payerName, provider: c.provider || '', cptCode: c.cptCode || '', icdCode: c.icdCode || '', description: c.description || '', amount: c.amount || '', status: c.status || 'SUBMITTED', dateSubmitted: c.dateSubmitted || '', allowedAmount: c.allowedAmount || '', paidAmount: c.paidAmount || '', denialReason: c.denialReason || '', dateProcessed: c.dateProcessed || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.claimId?.trim() || !form.patientName?.trim() || !form.payerName?.trim() || !form.amount) { showToast('Claim ID, Patient, Payer, and Amount are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0, allowedAmount: form.allowedAmount ? parseFloat(form.allowedAmount) : null, paidAmount: form.paidAmount ? parseFloat(form.paidAmount) : null };
      if (editing) { await claimsApi.update(editing.id, payload); showToast('Claim updated'); }
      else { await claimsApi.submit(payload); showToast('Claim submitted'); }
      setModalOpen(false); load();
    } catch (e) { showToast(e?.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await claimsApi.delete(deleteConfirm.id); setDeleteConfirm(null); showToast('Claim deleted'); load(); }
    catch { showToast('Delete failed', 'error'); }
  };

  const cols = [{ key: 'claimId', label: 'Claim ID' }, { key: 'patientName', label: 'Patient' }, { key: 'payerName', label: 'Payer' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }];

  return (
    <div className="space-y-4">
      {toast && (<div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.msg}<button onClick={() => setToast(null)} className="hover:opacity-75"><FiX size={14} /></button></div>)}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Claims Management</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Insurance clearinghouse dashboard.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 text-sm transition"><FiRefreshCw size={14} /></button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 text-sm transition"><FiDownload size={14} /></button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 w-36 hidden group-hover:block z-10">
              <button onClick={() => exportToCSV(filtered, 'claims-report', cols)} className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-50">Export CSV</button>
              <button onClick={() => exportToPDF('Claims Report', dataToHtmlTable(filtered, cols))} className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-50">Export PDF</button>
            </div>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition"><FiPlus size={16} /> Submit Claim</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Claims" value={stats.total} icon={FiDollarSign} color="teal" />
        <StatCard title="Pending" value={stats.pending} icon={FiClock} color="amber" />
        <StatCard title="Paid" value={stats.paid} icon={FiCheckCircle} color="green" />
        <StatCard title="Denied" value={stats.denied} icon={FiXCircle} color="rose" />
      </div>

      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search claims..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="flex items-center gap-2"><FiFilter size={14} className="text-secondary-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead><tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Claim ID</th><th className="px-4 py-3 text-left">Patient</th><th className="px-4 py-3 text-left">Payer</th><th className="px-4 py-3 text-left">Provider</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-secondary-400">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-secondary-400">No claims found.</td></tr>
              : filtered.map(c => (
                <tr key={c.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                  <td className="px-4 py-3 font-mono font-semibold text-primary-600">{c.claimId}</td>
                  <td className="px-4 py-3 text-secondary-900 dark:text-white">{c.patientName}</td>
                  <td className="px-4 py-3 text-secondary-500 text-xs">{c.payerName}</td>
                  <td className="px-4 py-3 text-secondary-500 text-xs">{c.provider || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-3 text-secondary-500 text-xs">{c.dateSubmitted || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition"><FiEdit2 size={14} /></button>
                    <button onClick={() => setDeleteConfirm(c)} className="p-1.5 rounded-lg hover:bg-urgent-50 text-secondary-500 hover:text-urgent-600 transition"><FiTrash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Claim Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Claim' : 'Submit New Claim'} size="lg">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Claim ID *</label><input value={form.claimId} onChange={e => set('claimId', e.target.value)} className={inputClass} placeholder="CLM-2026-0016" readOnly={!!editing} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Date Submitted</label><input type="date" value={form.dateSubmitted} onChange={e => set('dateSubmitted', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Patient Name *</label><input value={form.patientName} onChange={e => set('patientName', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Patient ID</label><input value={form.patientId} onChange={e => set('patientId', e.target.value)} className={inputClass} placeholder="PAT-001" /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Payer / Insurance *</label><input value={form.payerName} onChange={e => set('payerName', e.target.value)} className={inputClass} placeholder="Star Health Insurance" /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Provider</label><input value={form.provider} onChange={e => set('provider', e.target.value)} className={inputClass} placeholder="Dr. Name" /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">CPT Code</label><input value={form.cptCode} onChange={e => set('cptCode', e.target.value)} className={inputClass} placeholder="99213" /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">ICD Code</label><input value={form.icdCode} onChange={e => set('icdCode', e.target.value)} className={inputClass} placeholder="I10" /></div>
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} className={inputClass + ' h-16 resize-none'} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Amount (₹) *</label><input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputClass}>
                {STATUS_OPTIONS.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            {editing && (<>
              <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Allowed Amount</label><input type="number" step="0.01" value={form.allowedAmount} onChange={e => set('allowedAmount', e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Paid Amount</label><input type="number" step="0.01" value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Date Processed</label><input type="date" value={form.dateProcessed} onChange={e => set('dateProcessed', e.target.value)} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Denial Reason</label><input value={form.denialReason} onChange={e => set('denialReason', e.target.value)} className={inputClass} /></div>
            </>)}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Update Claim' : 'Submit Claim'}</button>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Claim" size="sm">
        <p className="text-sm text-secondary-700 dark:text-secondary-300">Delete claim <strong>{deleteConfirm?.claimId}</strong>? This cannot be undone.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-urgent-600 hover:bg-urgent-700 text-white text-sm font-medium transition">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
