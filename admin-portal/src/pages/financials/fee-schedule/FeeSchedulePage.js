import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiList, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { feeScheduleApi } from '../../../services/financialService';

const CATEGORIES = ['E&M', 'Emergency', 'Behavioral Health', 'Laboratory', 'Radiology', 'Procedures', 'Physical Therapy', 'Preventive', 'Immunization', 'Hospital'];
const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';
const emptyFee = { code: '', description: '', category: 'E&M', fee: '', medicareRate: '', active: true };

export default function FeeSchedulePage() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFee);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await feeScheduleApi.getAll(); setFees(Array.isArray(data) ? data : data?.content || []); }
    catch { setFees([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = fees.filter(f => { const q = search.toLowerCase(); return !q || [f.code, f.description, f.category].some(v => v?.toLowerCase().includes(q)); });
  const formatCurrency = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

  const openCreate = () => { setEditing(null); setForm(emptyFee); setModalOpen(true); };
  const openEdit = (f) => { setEditing(f); setForm({ code: f.code, description: f.description, category: f.category, fee: f.fee || '', medicareRate: f.medicareRate || '', active: f.active !== false }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.code?.trim() || !form.description?.trim() || !form.fee) { showToast('Code, description, and fee are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, fee: parseFloat(form.fee), medicareRate: form.medicareRate ? parseFloat(form.medicareRate) : null };
      if (editing) { await feeScheduleApi.update(editing.id, payload); showToast('Fee updated'); }
      else { await feeScheduleApi.create(payload); showToast('Fee created'); }
      setModalOpen(false); load();
    } catch (e) { showToast(e?.response?.data?.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await feeScheduleApi.delete(deleteConfirm.id); setDeleteConfirm(null); showToast('Fee deleted'); load(); }
    catch { showToast('Delete failed', 'error'); }
  };

  return (
    <div className="space-y-4">
      {toast && (<div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.msg}<button onClick={() => setToast(null)} className="hover:opacity-75"><FiX size={14} /></button></div>)}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Fee Schedule</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Procedure and service fee management. {fees.length > 0 && <span className="text-secondary-400">({fees.length} codes)</span>}</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto"><FiPlus size={16} /> Add Fee</button>
      </div>

      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-700">
          <div className="relative max-w-sm"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code or description..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500" /></div>
        </div>
        {loading ? <div className="p-12 text-center text-secondary-400">Loading...</div>
        : filtered.length === 0 ? <div className="p-12 text-center text-secondary-400"><FiList size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">{search ? 'No matching fees.' : 'No fee schedule data.'}</p></div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-right">Fee</th><th className="px-4 py-3 text-right">Medicare Rate</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                    <td className="px-4 py-3 font-mono font-semibold text-primary-600">{f.code}</td>
                    <td className="px-4 py-3 text-secondary-700 dark:text-secondary-300">{f.description}</td>
                    <td className="px-4 py-3"><Badge variant="gray">{f.category}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold text-secondary-900 dark:text-white">{formatCurrency(f.fee)}</td>
                    <td className="px-4 py-3 text-right text-secondary-500">{formatCurrency(f.medicareRate)}</td>
                    <td className="px-4 py-3"><Badge variant={f.active !== false ? 'success' : 'gray'}>{f.active !== false ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition"><FiEdit2 size={14} /></button>
                      <button onClick={() => setDeleteConfirm(f)} className="p-1.5 rounded-lg hover:bg-urgent-50 text-secondary-500 hover:text-urgent-600 transition"><FiTrash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Fee' : 'Add Fee Schedule'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Code *</label><input value={form.code} onChange={e => set('code', e.target.value)} className={inputClass} placeholder="99213" readOnly={!!editing} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inputClass}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description *</label><input value={form.description} onChange={e => set('description', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Fee Amount (₹) *</label><input type="number" step="0.01" value={form.fee} onChange={e => set('fee', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Medicare Rate (₹)</label><input type="number" step="0.01" value={form.medicareRate} onChange={e => set('medicareRate', e.target.value)} className={inputClass} /></div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
              <label className="text-sm text-secondary-700 dark:text-secondary-300">Active</label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Fee" size="sm">
        <p className="text-sm text-secondary-700 dark:text-secondary-300">Delete fee <strong>{deleteConfirm?.code}</strong> — {deleteConfirm?.description}?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-urgent-600 hover:bg-urgent-700 text-white text-sm font-medium transition">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
