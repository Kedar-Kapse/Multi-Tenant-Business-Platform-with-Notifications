import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiGrid, FiAlertTriangle, FiRefreshCw, FiCheckCircle, FiCopy } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { tenantApi } from '../../../services/organizationService';
import { toast } from '../../../components/ui/Toast';

const createForm = { name: '', tenantCode: '', adminUsername: '', adminEmail: '' };

// Same rule as the server: the hospital name becomes its address (Keycloak realm).
const toRealm = (name) => name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
// e.g. on platform.admin.kapse.online -> sunrise-hospital.admin.kapse.online
const isLocalHost = /^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)$/.test(window.location.hostname);
const adminAddressFor = (realm) => (isLocalHost || !realm ? null
  : `${window.location.protocol}//${window.location.host.replace(/^[^.]+/, realm)}`);

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
  // Login details of a just-created hospital's first admin -- shown once, never stored.
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

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
    if (!editing && !/^[A-Za-z0-9._-]{3,50}$/.test(form.adminUsername.trim())) {
      setFormError('Admin username: 3–50 letters, digits, dots, dashes or underscores.');
      return;
    }
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())) {
      setFormError('Please enter a valid admin email.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await tenantApi.update(editing.id, { name: form.name });
        toast.success(`Tenant "${form.name}" updated successfully`);
      } else {
        const res = await tenantApi.create({
          name: form.name.trim(),
          tenantCode: form.tenantCode.toUpperCase(),
          adminUsername: form.adminUsername.trim(),
          adminEmail: form.adminEmail.trim(),
        });
        toast.success(`Hospital "${form.name}" created`);
        setCopied(false);
        setCreated(res);
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
    const map = { ACTIVE: 'success', INACTIVE: 'gray', PROVISIONING: 'warning', FAILED: 'danger' };
    return <Badge variant={map[s] || 'gray'} dot>{s ? s.charAt(0) + s.slice(1).toLowerCase() : 'Unknown'}</Badge>;
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
                  {tenants.length === 0 ? (
                    <div className="flex flex-col items-center gap-3">
                      <p>No hospitals yet.</p>
                      <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">
                        <FiPlus size={16} /> Add your first hospital
                      </button>
                    </div>
                  ) : 'No tenants match your search.'}
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

          {!editing && adminAddressFor(toRealm(form.name)) && (
            <p className="text-[11px] text-secondary-500 -mt-2">
              Hospital address: <span className="font-mono text-secondary-700 dark:text-secondary-300 break-all">{adminAddressFor(toRealm(form.name))}</span>
            </p>
          )}

          {!editing && (
            <div className="pt-3 border-t border-secondary-100 dark:border-secondary-700 space-y-4">
              <p className="text-xs font-semibold text-secondary-700 dark:text-secondary-300">Hospital admin <span className="font-normal text-secondary-400">— the first person who can sign in and manage this hospital</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Admin username <span className="text-urgent-500">*</span></label>
                  <input
                    value={form.adminUsername}
                    onChange={(e) => setForm({ ...form, adminUsername: e.target.value.replace(/\s/g, '') })}
                    placeholder="e.g. admin.sunrise"
                    maxLength={50}
                    autoComplete="off"
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Admin email <span className="text-urgent-500">*</span></label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    placeholder="e.g. admin@sunrise.example"
                    maxLength={100}
                    autoComplete="off"
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-secondary-400">A temporary password is created for them and shown to you once. They choose their own password at first sign-in.</p>
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

      {/* First admin's login details: shown once */}
      <Modal open={!!created} onClose={() => setCreated(null)} title="Hospital created" size="sm">
        {created && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-700/30 flex items-center justify-center flex-shrink-0">
                <FiCheckCircle className="text-success-600" size={18} />
              </div>
              <p className="text-sm text-secondary-700 dark:text-secondary-300">
                <strong>{created.name}</strong> is ready. Give these sign-in details to the hospital admin.
              </p>
            </div>
            <dl className="rounded-lg bg-secondary-50 dark:bg-secondary-900/60 border border-secondary-200 dark:border-secondary-700 divide-y divide-secondary-200 dark:divide-secondary-700 text-sm">
              {created.adminLoginUrl && (
                <div className="px-3 py-2">
                  <dt className="text-[11px] text-secondary-500">Address</dt>
                  <dd className="font-mono text-secondary-900 dark:text-white break-all">{created.adminLoginUrl}</dd>
                </div>
              )}
              <div className="px-3 py-2">
                <dt className="text-[11px] text-secondary-500">Username</dt>
                <dd className="font-mono text-secondary-900 dark:text-white break-all">{created.adminUsername}</dd>
              </div>
              <div className="px-3 py-2 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <dt className="text-[11px] text-secondary-500">Temporary password</dt>
                  <dd className="font-mono text-secondary-900 dark:text-white break-all">{created.adminTemporaryPassword}</dd>
                </div>
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(created.adminTemporaryPassword); setCopied(true); }
                    catch { toast.error('Copy failed — please select and copy the password'); }
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs text-secondary-600 dark:text-secondary-300 hover:bg-white dark:hover:bg-secondary-800 transition"
                >
                  <FiCopy size={12} /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </dl>
            <p className="text-xs text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-700/20 border border-warning-200 dark:border-warning-700 rounded-lg p-2.5">
              This password is shown only now. The admin must change it at first sign-in.
            </p>
            <div className="flex justify-end">
              <button onClick={() => setCreated(null)} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Done</button>
            </div>
          </div>
        )}
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
