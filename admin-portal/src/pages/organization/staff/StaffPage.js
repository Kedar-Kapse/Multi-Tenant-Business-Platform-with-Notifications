import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiAlertTriangle, FiChevronLeft, FiChevronRight, FiUser, FiX, FiEye, FiCheckCircle } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { staffApi } from '../../../services/organizationService';

const ROLES = ['DOCTOR', 'THERAPIST', 'NURSE', 'PHARMACIST', 'TECHNICIAN', 'BILLING', 'ADMIN'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const ROLE_LABELS = {
  DOCTOR: 'Doctor', THERAPIST: 'Therapist', NURSE: 'Nurse',
  PHARMACIST: 'Pharmacist', TECHNICIAN: 'Technician', BILLING: 'Billing', ADMIN: 'Admin',
};

const ROLE_COLORS = {
  DOCTOR: 'teal', THERAPIST: 'info', NURSE: 'success',
  PHARMACIST: 'warning', TECHNICIAN: 'gray', BILLING: 'gray', ADMIN: 'info',
};

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', role: 'NURSE',
  dateOfBirth: '', gender: 'MALE', licenseNumber: '', specialization: '',
  experienceYears: '', addressLine1: '', addressLine2: '', city: '',
  state: '', country: '', zipCode: '', profilePhotoUrl: '', password: '',
};

function InputField({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        {label} {required && <span className="text-urgent-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-urgent-500 mt-1">{error}</p>}
    </div>
  );
}

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';
export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (search || roleFilter || statusFilter) {
        data = await staffApi.search(search || undefined, roleFilter || undefined, statusFilter || undefined, page, 20);
      } else {
        data = await staffApi.getAll(page, 20);
      }
      setStaff(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch (err) {
      console.error('Staff load error:', err);
      // Don't clear staff list on transient errors (token refresh in progress)
      if (!err?.config?._retry) {
        setStaff([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0); }, [search, roleFilter, statusFilter]);

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^[+]?[0-9\-\s()]{7,20}$/.test(form.phone)) e.phone = 'Invalid phone format';
    if (!form.role) e.role = 'Role is required';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    if (!form.gender) e.gender = 'Gender is required';
    if (!editing && !form.password.trim()) e.password = 'Password is required';
    else if (!editing && form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.experienceYears && (isNaN(form.experienceYears) || form.experienceYears < 0 || form.experienceYears > 60))
      e.experienceYears = 'Must be 0-60';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      firstName: s.firstName || '', lastName: s.lastName || '', email: s.email || '',
      phone: s.phone || '', role: s.role || 'NURSE', dateOfBirth: s.dateOfBirth || '',
      gender: s.gender || 'MALE', licenseNumber: s.licenseNumber || '',
      specialization: s.specialization || '', experienceYears: s.experienceYears ?? '',
      addressLine1: s.addressLine1 || '', addressLine2: s.addressLine2 || '',
      city: s.city || '', state: s.state || '', country: s.country || '',
      zipCode: s.zipCode || '', profilePhotoUrl: s.profilePhotoUrl || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Sanitize payload: convert empty strings to null for optional fields
      const payload = {};
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'role', 'dateOfBirth', 'gender'];
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'experienceYears') {
          payload[key] = value !== '' ? parseInt(value, 10) : null;
        } else if (requiredFields.includes(key)) {
          payload[key] = value;
        } else {
          // Optional fields: empty string → null (avoids DB issues)
          payload[key] = value && value.trim() !== '' ? value.trim() : null;
        }
      });
      if (editing) {
        await staffApi.update(editing.id, payload);
        showToast('Staff member updated successfully');
      } else {
        await staffApi.create(payload);
        showToast('Staff member created successfully');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      console.error('Staff save error:', err?.response?.data || err);
      const data = err?.response?.data;
      let msg = 'An unexpected error occurred. Please try again.';
      if (data?.message) {
        msg = data.message;
      } else if (err?.response?.status === 401) {
        msg = 'Session expired. Please log in again.';
      } else if (err?.response?.status === 403) {
        msg = 'You do not have permission to perform this action.';
      } else if (err?.message?.includes('Network Error')) {
        msg = 'Unable to reach the server. Please check your connection.';
      }
      if (data?.fieldErrors) {
        setErrors(data.fieldErrors);
      }
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await staffApi.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast('Staff member deactivated successfully');
      load();
    } catch {
      showToast('Failed to deactivate staff member', 'error');
    }
  };

  const handleActivate = async (s) => {
    try {
      await staffApi.activate(s.id);
      showToast(`${s.firstName} ${s.lastName} activated successfully`);
      load();
    } catch {
      showToast('Failed to activate staff member', 'error');
    }
  };

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.message}
          <button onClick={() => setToast(null)} className="hover:opacity-75"><FiX size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Staff Management</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">
            Manage clinical and administrative staff accounts.
            {totalElements > 0 && <span className="ml-2 text-secondary-400">({totalElements} total)</span>}
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
          <FiPlus size={16} /> Add Staff
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-700">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              {(search || roleFilter || statusFilter) && (
                <button
                  onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); }}
                  className="px-3 py-2 rounded-lg text-xs text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Staff Member</th>
                <th className="px-5 py-3 text-left font-medium">Email</th>
                <th className="px-5 py-3 text-left font-medium">Phone</th>
                <th className="px-5 py-3 text-left font-medium">Role</th>
                <th className="px-5 py-3 text-left font-medium">Specialization</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-secondary-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Loading staff...
                  </div>
                </td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-secondary-400">
                  <div className="flex flex-col items-center gap-2">
                    <FiUser size={24} className="text-secondary-300" />
                    No staff members found.
                  </div>
                </td></tr>
              ) : staff.map((s) => (
                <tr key={s.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-xs flex-shrink-0">
                        {s.profilePhotoUrl ? (
                          <img src={s.profilePhotoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          `${(s.firstName || '')[0] || ''}${(s.lastName || '')[0] || ''}`.toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-secondary-900 dark:text-white">{s.firstName} {s.lastName}</p>
                        {s.licenseNumber && <p className="text-xs text-secondary-400">Lic: {s.licenseNumber}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-secondary-600 dark:text-secondary-400">{s.email}</td>
                  <td className="px-5 py-3 text-secondary-600 dark:text-secondary-400">{s.phone}</td>
                  <td className="px-5 py-3"><Badge variant={ROLE_COLORS[s.role] || 'gray'}>{ROLE_LABELS[s.role] || s.role}</Badge></td>
                  <td className="px-5 py-3 text-secondary-600 dark:text-secondary-400">{s.specialization || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge variant={s.status === 'ACTIVE' ? 'success' : 'danger'} dot>
                      {s.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewModal(s)} title="View Profile" className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 hover:text-primary-600 transition">
                        <FiEye size={14} />
                      </button>
                      <button onClick={() => openEdit(s)} title="Edit" className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 hover:text-primary-600 transition">
                        <FiEdit2 size={14} />
                      </button>
                      {s.status === 'ACTIVE' ? (
                        <button onClick={() => setDeleteConfirm(s)} title="Deactivate" className="p-1.5 rounded-lg hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-secondary-500 hover:text-urgent-600 transition">
                          <FiTrash2 size={14} />
                        </button>
                      ) : (
                        <button onClick={() => handleActivate(s)} title="Activate" className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-secondary-500 hover:text-emerald-600 transition">
                          <FiCheckCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 dark:border-secondary-700">
            <p className="text-xs text-secondary-500">
              Page {page + 1} of {totalPages} ({totalElements} records)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <FiChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i;
                else if (page < 3) pageNum = i;
                else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
                else pageNum = page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                      page === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-600 dark:text-secondary-400'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Create / Edit Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Staff Member' : 'Add Staff Member'} size="lg">
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Personal Information */}
          <div>
            <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="First Name" required error={errors.firstName}>
                <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} placeholder="Enter first name" />
              </InputField>
              <InputField label="Last Name" required error={errors.lastName}>
                <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} placeholder="Enter last name" />
              </InputField>
              <InputField label="Email" required error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} placeholder="name@hospital.com" />
              </InputField>
              <InputField label="Phone Number" required error={errors.phone}>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} placeholder="+1 (555) 123-4567" />
              </InputField>
              <InputField label="Date of Birth" required error={errors.dateOfBirth}>
                <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className={inputClass} />
              </InputField>
              <InputField label="Gender" required error={errors.gender}>
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputClass}>
                  {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
                </select>
              </InputField>
              {!editing && (
                <InputField label="Login Password" required error={errors.password}>
                  <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className={inputClass} placeholder="Min 6 characters" />
                </InputField>
              )}
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">Professional Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Role" required error={errors.role}>
                <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputClass}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </InputField>
              <InputField label="Specialization">
                <input value={form.specialization} onChange={(e) => set('specialization', e.target.value)} className={inputClass} placeholder="e.g. Cardiology, Pediatrics" />
              </InputField>
              <InputField label="License Number">
                <input value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} className={inputClass} placeholder="e.g. MD-12345" />
              </InputField>
              <InputField label="Experience (Years)" error={errors.experienceYears}>
                <input type="number" min="0" max="60" value={form.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} className={inputClass} placeholder="0" />
              </InputField>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">Address (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <InputField label="Address Line 1">
                  <input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} className={inputClass} placeholder="Street address" />
                </InputField>
              </div>
              <div className="sm:col-span-2">
                <InputField label="Address Line 2">
                  <input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} className={inputClass} placeholder="Apt, Suite, Floor" />
                </InputField>
              </div>
              <InputField label="City">
                <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} placeholder="City" />
              </InputField>
              <InputField label="State">
                <input value={form.state} onChange={(e) => set('state', e.target.value)} className={inputClass} placeholder="State/Province" />
              </InputField>
              <InputField label="Country">
                <input value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass} placeholder="Country" />
              </InputField>
              <InputField label="Zip Code">
                <input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} className={inputClass} placeholder="Zip/Postal code" />
              </InputField>
            </div>
          </div>

          {/* Profile Photo */}
          <div>
            <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">Profile Photo (Optional)</h3>
            <InputField label="Photo URL">
              <input value={form.profilePhotoUrl} onChange={(e) => set('profilePhotoUrl', e.target.value)} className={inputClass} placeholder="https://example.com/photo.jpg" />
            </InputField>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
            {saving ? 'Saving...' : editing ? 'Update Staff' : 'Create Staff'}
          </button>
        </div>
      </Modal>

      {/* ── View Profile Modal ── */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Staff Profile" size="lg">
        {viewModal && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl flex-shrink-0">
                {viewModal.profilePhotoUrl ? (
                  <img src={viewModal.profilePhotoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  `${(viewModal.firstName || '')[0] || ''}${(viewModal.lastName || '')[0] || ''}`.toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">{viewModal.firstName} {viewModal.lastName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={ROLE_COLORS[viewModal.role] || 'gray'}>{ROLE_LABELS[viewModal.role] || viewModal.role}</Badge>
                  <Badge variant={viewModal.status === 'ACTIVE' ? 'success' : 'danger'} dot>{viewModal.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <ProfileField label="Email" value={viewModal.email} />
              <ProfileField label="Phone" value={viewModal.phone} />
              <ProfileField label="Date of Birth" value={viewModal.dateOfBirth} />
              <ProfileField label="Gender" value={viewModal.gender ? viewModal.gender.charAt(0) + viewModal.gender.slice(1).toLowerCase() : '—'} />
              <ProfileField label="License Number" value={viewModal.licenseNumber} />
              <ProfileField label="Specialization" value={viewModal.specialization} />
              <ProfileField label="Experience" value={viewModal.experienceYears != null ? `${viewModal.experienceYears} years` : null} />
            </div>

            {/* Address */}
            {(viewModal.addressLine1 || viewModal.city) && (
              <div>
                <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">Address</h4>
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  {[viewModal.addressLine1, viewModal.addressLine2, viewModal.city, viewModal.state, viewModal.country, viewModal.zipCode].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-secondary-400 flex gap-4 pt-2 border-t border-secondary-100 dark:border-secondary-700">
              {viewModal.createdAt && <span>Created: {new Date(viewModal.createdAt).toLocaleDateString()}</span>}
              {viewModal.updatedAt && <span>Updated: {new Date(viewModal.updatedAt).toLocaleDateString()}</span>}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setViewModal(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">
                Close
              </button>
              <button onClick={() => { setViewModal(null); openEdit(viewModal); }} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">
                Edit
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Deactivate Confirmation ── */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Deactivate Staff Member" size="sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-urgent-100 dark:bg-urgent-900/30 flex items-center justify-center flex-shrink-0">
            <FiAlertTriangle className="text-urgent-600" size={18} />
          </div>
          <div>
            <p className="text-sm text-secondary-700 dark:text-secondary-300">
              Are you sure you want to deactivate <strong>{deleteConfirm?.firstName} {deleteConfirm?.lastName}</strong>?
            </p>
            <p className="text-xs text-secondary-500 mt-1">The staff member will be marked as inactive. This can be reversed.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">
            Cancel
          </button>
          <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-urgent-600 hover:bg-urgent-700 text-white text-sm font-medium transition">
            Deactivate
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-secondary-500 dark:text-secondary-400">{label}</dt>
      <dd className="text-sm font-medium text-secondary-900 dark:text-white mt-0.5">{value || '—'}</dd>
    </div>
  );
}
