import { useState, useEffect, useCallback } from 'react';
import { FiShield, FiUsers, FiCheck, FiX, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { permissionsApi } from '../../../services/securityService';
import EmptyState from '../../../components/ui/EmptyState';
import { toast } from '../../../components/ui/Toast';

const MODULES = ['Dashboard', 'Staff', 'Tenants', 'EHR', 'Inventory', 'Claims', 'Fee Schedule', 'Audit Logs', 'Permissions'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'export'];

export default function PermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [, setEditingRole] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editPerms, setEditPerms] = useState({});
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permRole, setPermRole] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (msg, type = 'success') => (type === 'error' ? toast.error(msg) : toast.success(msg));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await permissionsApi.getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (e) {
      setRoles([]);
      setError(e?.response?.data?.message || 'Could not load roles.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasPermission = (role, module, action) => role.permissions?.[module]?.includes(action);

  const countPermissions = (role) => {
    let count = 0;
    Object.values(role.permissions || {}).forEach(actions => { count += actions.length; });
    return count;
  };

  // Create role
  const openCreateRole = () => { setEditingRole(null); setForm({ name: '', description: '' }); setModalOpen(true); };

  const handleCreateRole = async () => {
    if (!form.name.trim()) { showToast('Role name is required', 'error'); return; }
    setSaving(true);
    try {
      await permissionsApi.createRole(form);
      showToast(`Role "${form.name}" created`);
      setModalOpen(false); load();
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to create role', 'error'); }
    finally { setSaving(false); }
  };

  // Delete role
  const handleDeleteRole = async () => {
    try {
      await permissionsApi.deleteRole(deleteConfirm.name);
      showToast(`Role "${deleteConfirm.name}" deleted`);
      setDeleteConfirm(null); load();
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to delete role', 'error'); }
  };

  // Edit permissions
  const openPermEditor = (role) => {
    setPermRole(role);
    const perms = {};
    MODULES.forEach(m => {
      perms[m] = {};
      ACTIONS.forEach(a => {
        perms[m][a] = hasPermission(role, m, a) || false;
      });
    });
    setEditPerms(perms);
    setPermModalOpen(true);
  };

  const togglePerm = (module, action) => {
    setEditPerms(prev => ({
      ...prev,
      [module]: { ...prev[module], [action]: !prev[module][action] }
    }));
  };

  const toggleModuleAll = (module) => {
    const allChecked = ACTIONS.every(a => editPerms[module]?.[a]);
    setEditPerms(prev => ({
      ...prev,
      [module]: ACTIONS.reduce((acc, a) => ({ ...acc, [a]: !allChecked }), {})
    }));
  };

  const toggleActionAll = (action) => {
    const allChecked = MODULES.every(m => editPerms[m]?.[action]);
    setEditPerms(prev => {
      const updated = { ...prev };
      MODULES.forEach(m => { updated[m] = { ...updated[m], [action]: !allChecked }; });
      return updated;
    });
  };

  const savePermissions = async () => {
    const grid = {};
    MODULES.forEach(m => { grid[m] = ACTIONS.filter(a => editPerms[m]?.[a]); });
    setSaving(true);
    try {
      await permissionsApi.savePermissions(permRole.name, grid);
      setPermModalOpen(false);
      showToast(`Permissions saved for "${permRole.name}"`);
      load();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const roleColor = (name) => {
    const map = { ADMIN: 'danger', PHYSICIAN: 'teal', NURSE: 'success', THERAPIST: 'info', PATIENT: 'gray', PROVIDER: 'warning' };
    return map[name?.toUpperCase()] || 'gray';
  };

  return (
    <div className="space-y-4">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Role & Permissions</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Granular RBAC management for HIPAA compliance.</p>
        </div>
        <button onClick={openCreateRole} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
          <FiPlus size={16} /> Add Role
        </button>
      </div>

      <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 flex items-center gap-3">
        <FiShield className="text-primary-600 flex-shrink-0" size={16} />
        <p className="text-xs text-primary-700 dark:text-primary-400">Role-based access control (RBAC) enforces the principle of least privilege per HIPAA §164.312(a)(1). All permission changes are audit-logged.</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-secondary-400"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Loading roles...</div>
      ) : error ? (
        <Card><EmptyState icon={FiShield} title="Couldn't load roles" description={error}
          action={<button onClick={load} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm">Try again</button>} /></Card>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role.id}>
              <div className="p-4 border-b border-secondary-100 dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                    <FiUsers size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{role.name}</h3>
                      <Badge variant={roleColor(role.name)}>{countPermissions(role)} perms</Badge>
                    </div>
                    <p className="text-xs text-secondary-500">{role.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openPermEditor(role)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition">
                    <FiEdit2 size={12} /> Edit Permissions
                  </button>
                  {!role.builtIn && (
                    <button onClick={() => setDeleteConfirm(role)} className="p-1.5 rounded-lg hover:bg-urgent-50 text-secondary-500 hover:text-urgent-600 transition">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary-50 dark:bg-secondary-800/50">
                      <th className="px-4 py-2 text-left text-secondary-500 font-medium uppercase tracking-wider">Module</th>
                      {ACTIONS.map(a => (
                        <th key={a} className="px-4 py-2 text-center text-secondary-500 font-medium uppercase tracking-wider">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                    {MODULES.map(mod => (
                      <tr key={mod} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                        <td className="px-4 py-2 font-medium text-secondary-700 dark:text-secondary-300">{mod}</td>
                        {ACTIONS.map(act => (
                          <td key={act} className="px-4 py-2 text-center">
                            {hasPermission(role, mod, act) ? (
                              <span className="inline-flex w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center"><FiCheck className="text-success-600" size={12} /></span>
                            ) : (
                              <span className="inline-flex w-5 h-5 rounded bg-secondary-100 dark:bg-secondary-800 items-center justify-center"><FiX className="text-secondary-300 dark:text-secondary-600" size={12} /></span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Role" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Role Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))} placeholder="e.g. LAB_TECHNICIAN" className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this role" className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
          </div>
          <p className="text-xs text-secondary-500">This role will be created in Keycloak. Configure permissions after creation.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
            <button onClick={handleCreateRole} disabled={saving} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">{saving ? 'Creating...' : 'Create Role'}</button>
          </div>
        </div>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal open={permModalOpen} onClose={() => setPermModalOpen(false)} title={`Edit Permissions — ${permRole?.name}`} size="lg">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-xs min-w-[550px]">
            <thead className="sticky top-0 bg-white dark:bg-secondary-800 z-10">
              <tr className="border-b border-secondary-200 dark:border-secondary-700">
                <th className="px-4 py-3 text-left text-secondary-500 font-medium uppercase tracking-wider">Module</th>
                {ACTIONS.map(a => (
                  <th key={a} className="px-3 py-3 text-center">
                    <button onClick={() => toggleActionAll(a)} className="text-secondary-500 font-medium uppercase tracking-wider hover:text-primary-600 transition text-[10px]">{a}</button>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-secondary-400 text-[10px] uppercase">All</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {MODULES.map(mod => {
                const allChecked = ACTIONS.every(a => editPerms[mod]?.[a]);
                return (
                  <tr key={mod} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                    <td className="px-4 py-2.5 font-medium text-secondary-700 dark:text-secondary-300">{mod}</td>
                    {ACTIONS.map(act => (
                      <td key={act} className="px-3 py-2.5 text-center">
                        <button onClick={() => togglePerm(mod, act)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${editPerms[mod]?.[act] ? 'bg-primary-600 border-primary-600' : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-400'}`}>
                          {editPerms[mod]?.[act] && <FiCheck className="text-white" size={12} />}
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => toggleModuleAll(mod)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${allChecked ? 'bg-success-600 border-success-600' : 'border-secondary-300 dark:border-secondary-600 hover:border-success-400'}`}>
                        {allChecked && <FiCheck className="text-white" size={12} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setPermModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={savePermissions} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">{saving ? 'Saving…' : 'Save Permissions'}</button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Role" size="sm">
        <p className="text-sm text-secondary-700 dark:text-secondary-300">Delete role <strong>{deleteConfirm?.name}</strong>? This will remove it from Keycloak. Users with this role will lose access.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleDeleteRole} className="px-4 py-2 rounded-lg bg-urgent-600 hover:bg-urgent-700 text-white text-sm font-medium transition">Delete Role</button>
        </div>
      </Modal>
    </div>
  );
}
