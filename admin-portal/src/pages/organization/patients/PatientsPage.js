import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSearch, FiUser, FiX, FiMail } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { patientApi } from '../../../services/patientService';

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const STATUS_COLORS = {
  PENDING_REGISTRATION: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'gray',
  DELETED: 'danger',
};

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  dateOfBirth: '', gender: '',
  addressLine1: '', addressLine2: '', city: '', state: '', country: '', zipCode: '',
  providerId: '',
};

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

function Field({ label, required, error, children }) {
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

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await patientApi.list(page, 20, search || undefined, statusFilter || undefined);
      setPatients(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch (err) {
      console.error('Patients load error', err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (form.phone && !/^[+]?[0-9\-\s()]{7,20}$/.test(form.phone)) e.phone = 'Invalid phone';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => { setForm(emptyForm); setErrors({}); setModalOpen(true); };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => { payload[k] = v === '' ? null : v; });
      await patientApi.create(payload);
      showToast('Patient created — registration email dispatched');
      setModalOpen(false);
      load();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.fieldErrors) setErrors(data.fieldErrors);
      showToast(data?.message || 'Failed to create patient', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="hover:opacity-75"><FiX size={14} /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Patients</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">
            Create and manage patient accounts. New patients receive an email with a registration link.
            {totalElements > 0 && <span className="ml-2 text-secondary-400">({totalElements} total)</span>}
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
          <FiPlus size={16} /> Add Patient
        </button>
      </div>

      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-700">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className={`pl-9 ${inputClass}`} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputClass + ' sm:flex-none sm:w-48'}>
              <option value="">All statuses</option>
              <option value="PENDING_REGISTRATION">Pending Registration</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Patient</th>
                <th className="px-5 py-3 text-left font-medium">Email</th>
                <th className="px-5 py-3 text-left font-medium">Phone</th>
                <th className="px-5 py-3 text-left font-medium">DOB</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-secondary-400">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading patients...
                </td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-secondary-400">
                  <FiUser size={24} className="mx-auto mb-2 opacity-50" />
                  No patients found.
                </td></tr>
              ) : patients.map(p => (
                <tr key={p.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-xs">
                        {`${(p.firstName || '')[0] || ''}${(p.lastName || '')[0] || ''}`.toUpperCase()}
                      </div>
                      <p className="font-medium text-secondary-900 dark:text-white">{p.firstName} {p.lastName}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-secondary-600 dark:text-secondary-400 flex items-center gap-2"><FiMail size={12} />{p.email}</td>
                  <td className="px-5 py-3 text-secondary-600 dark:text-secondary-400">{p.phone || '—'}</td>
                  <td className="px-5 py-3 text-secondary-600 dark:text-secondary-400">{p.dateOfBirth || '—'}</td>
                  <td className="px-5 py-3"><Badge variant={STATUS_COLORS[p.status] || 'gray'} dot>{p.status}</Badge></td>
                  <td className="px-5 py-3 text-xs text-secondary-400">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 dark:border-secondary-700">
            <p className="text-xs text-secondary-500">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg text-xs hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-30 transition">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg text-xs hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-30 transition">Next</button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Patient" size="lg">
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Patient Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" required error={errors.firstName}>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Email" required error={errors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} placeholder="patient@example.com" />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="+1 (555) 123-4567" />
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Gender">
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Address (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Address Line 1"><input value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} className={inputClass} /></Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Address Line 2"><input value={form.addressLine2} onChange={e => set('addressLine2', e.target.value)} className={inputClass} /></Field>
              </div>
              <Field label="City"><input value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} /></Field>
              <Field label="State"><input value={form.state} onChange={e => set('state', e.target.value)} className={inputClass} /></Field>
              <Field label="Country"><input value={form.country} onChange={e => set('country', e.target.value)} className={inputClass} /></Field>
              <Field label="Zip"><input value={form.zipCode} onChange={e => set('zipCode', e.target.value)} className={inputClass} /></Field>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Patient'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
