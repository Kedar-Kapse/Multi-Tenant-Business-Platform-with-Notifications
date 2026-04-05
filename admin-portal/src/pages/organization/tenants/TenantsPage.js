import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiGrid, FiAlertTriangle, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { tenantApi } from '../../../services/organizationService';
import { toast } from '../../../components/ui/Toast';

const createForm = { name: '', tenantCode: '' };

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(createForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tenantApi.getAll();
      setTenants(Array.isArray(data) ? data : data?.content || []);
    } catch {
      setTenants([]);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    return !q || [t.name, t.tenantCode, t.status].some((f) => f?.toLowerCase().includes(q));
  });

  const openCreate = () => {
    setEditing(null);
    setForm(createForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name || '' });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');

    // Validate
    if (!form.name.trim()) {
      setFormError('Organization name is required.');
      return;
    }
    if (!editing && !form.tenantCode.trim()) {
      setFormError('Tenant code is required.');
      return;
    }
    if (!editing && (form.tenantCode.length < 3 || form.tenantCode.length > 10)) {
      setFormError('Tenant code must be 3–10 characters.');
      return;
    }
    if (!editing && !/^[A-Za-z0-9]+$/.test(form.tenantCode)) {
      setFormError('Tenant code must be alphanumeric (no spaces or special characters).');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await tenantApi.update(editing.id, { name: form.name });
        toast.success(`Tenant "${form.name}" updated successfully`);
      } else {
        await tenantApi.create({ name: form.name, tenantCode: form.tenantCode.toUpperCase() });
        toast.success(`Tenant "${form.name}" created successfully`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Save failed. Please try again.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await tenantApi.delete(deleteConfirm.id);
      toast.success(`Tenant "${deleteConfirm.name}" deactivated`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Deactivation failed');
    }
  };

  const handleActivate = async (t) => {
    try {
      await tenantApi.activate(t.id);
      toast.success(`Tenant "${t.name}" activated`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Activation failed');
    }
  };

  const statusBadge = (s) => {
    const map = { ACTIVE: 'success', INACTIVE: 'gray' };
    return <Badge variant={map[s] || 'gray'} dot>{s || 'ACTIVE'}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Tenant Management</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Manage healthcare organizations on the platform.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm transition">
            <FiRefreshCw size={14} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={openCreate} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">
            <FiPlus size={16} /> Add Tenant
          </button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-secondary-100 dark:border-secondary-700">
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenants…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider">
                <th className="px-3 sm:px-5 py-3 text-left font-medium">Organization</th>
                <th className="px-3 sm:px-5 py-3 text-left font-medium">Tenant Code</th>
                <th className="px-3 sm:px-5 py-3 text-left font-medium">Status</th>
                <th className="px-3 sm:px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-secondary-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-secondary-400">
                  {tenants.length === 0 ? 'No tenants yet. Click "Add Tenant" to create one.' : 'No tenants match your search.'}
                </td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600"><FiGrid size={14} /></div>
                      <span className="font-medium text-secondary-900 dark:text-white">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs px-2 py-1 rounded bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300">{t.tenantCode}</span>
                  </td>
                  <td className="px-5 py-3">{statusBadge(t.status)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 hover:text-primary-600 transition" title="Edit"><FiEdit2 size={14} /></button>
                      {t.status === 'ACTIVE' ? (
                        <button onClick={() => setDeleteConfirm(t)} className="p-1.5 rounded-lg hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-secondary-500 hover:text-urgent-600 transition" title="Deactivate"><FiTrash2 size={14} /></button>
                      ) : (
                        <button onClick={() => handleActivate(t)} className="p-1.5 rounded-lg hover:bg-success-50 dark:hover:bg-success-900/20 text-secondary-500 hover:text-success-600 transition" title="Activate"><FiCheckCircle size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Tenant' : 'Add New Tenant'}>
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-urgent-50 dark:bg-urgent-900/20 border border-urgent-200 dark:border-urgent-800 text-urgent-700 dark:text-urgent-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Organization Name <span className="text-urgent-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. City General Hospital"
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white"
              autoFocus
            />
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Tenant Code <span className="text-urgent-500">*</span></label>
              <input
                value={form.tenantCode}
                onChange={(e) => setForm({ ...form, tenantCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                placeholder="e.g. HOSP001"
                maxLength={10}
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white"
              />
              <p className="text-[11px] text-secondary-400 mt-1">3–10 alphanumeric characters. Cannot be changed after creation.</p>
            </div>
          )}

          {editing && (
            <div className="p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800">
              <p className="text-[11px] text-secondary-500">Tenant Code: <span className="font-mono font-medium text-secondary-700 dark:text-secondary-300">{editing.tenantCode}</span></p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Update Tenant' : 'Create Tenant'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Deactivate Tenant" size="sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-urgent-100 dark:bg-urgent-900/30 flex items-center justify-center flex-shrink-0">
            <FiAlertTriangle className="text-urgent-600" size={18} />
          </div>
          <div>
            <p className="text-sm text-secondary-700 dark:text-secondary-300">Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong> ({deleteConfirm?.tenantCode})?</p>
            <p className="text-xs text-secondary-500 mt-1">All users in this organization will lose access.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-urgent-600 hover:bg-urgent-700 text-white text-sm font-medium transition">Deactivate</button>
        </div>
      </Modal>
    </div>
  );
}
