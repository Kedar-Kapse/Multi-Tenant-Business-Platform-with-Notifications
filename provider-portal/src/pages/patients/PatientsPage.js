import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSearch, FiUser, FiMail, FiX, FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { patientApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';

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
  mrn: '', ssn: '',
  addressLine1: '', addressLine2: '', city: '', state: '', country: '', zipCode: '',
  locationCode: '',
  pccSyncRequired: false,
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
  const user = useAuthStore((s) => s.user);
  const providerId = user?.staffId || user?.id || user?.sub;

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showSsn, setShowSsn] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await patientApi.list(page, 20, search || undefined);
      setPatients(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch (err) {
      console.error('Patients load error', err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search]);

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
    if (!form.mrn.trim()) e.mrn = 'MRN is required';
    if (!form.ssn.trim()) e.ssn = 'SSN is required';
    else if (!/^\d{3}-\d{2}-\d{4}$|^\d{9}$/.test(form.ssn.trim())) e.ssn = 'Format: 123-45-6789 or 9 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => { setForm(emptyForm); setErrors({}); setShowSsn(false); setModalOpen(true); };

  const handleSyncPcc = async (patientId) => {
    setSyncing(patientId);
    try {
      await patientApi.syncToPcc(patientId);
      showToast('PCC sync triggered — patient will be synced shortly');
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to trigger PCC sync', 'error');
    } finally {
      setSyncing(null);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => { payload[k] = (v === '' || v === undefined) ? null : v; });
      payload.pccSyncRequired = form.pccSyncRequired === true;
      if (providerId) {
        await patientApi.createForProvider(providerId, payload);
      } else {
        await patientApi.create(payload);
      }
      showToast('Patient created — registration email dispatched');
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (data?.fieldErrors) setErrors(data.fieldErrors);
      const message = status === 409 || (status === 400 && data?.message?.includes('already exists'))
        ? (data?.message || 'A patient with this email, MRN, or SSN already exists.')
        : (data?.message || 'Failed to create patient. Please try again.');
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)}><FiX size={14} /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">My Patients</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">
            Register and manage patients assigned to you.
            {totalElements > 0 && <span className="ml-2 text-secondary-400">({totalElements} total)</span>}
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
          <FiPlus size={16} /> Add Patient
        </button>
      </div>

      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-700">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className={`pl-9 ${inputClass}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-secondary-400">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : patients.length === 0 ? (
            <div className="col-span-full text-center py-12 text-secondary-400">
              <FiUser size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No patients yet. Click "Add Patient" to register your first one.</p>
            </div>
          ) : patients.map(p => (
            <div key={p.id} className="p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  {`${(p.firstName || '')[0] || ''}${(p.lastName || '')[0] || ''}`.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{p.firstName} {p.lastName}</p>
                  <Badge variant={STATUS_COLORS[p.status] || 'gray'} dot>{p.status}</Badge>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-secondary-500">
                <div className="flex items-center gap-2"><FiMail size={12} /><span className="truncate">{p.email}</span></div>
                {p.mrn && <div className="font-mono text-secondary-400">MRN: {p.mrn}</div>}
                {p.phone && <div className="flex items-center gap-2">📱<span>{p.phone}</span></div>}
                {p.dateOfBirth && <div className="text-secondary-400">DOB: {p.dateOfBirth}</div>}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700">
                <div className="flex items-center gap-2">
                  {p.pccSyncStatus ? (
                    <Badge variant={
                      p.pccSyncStatus === 'SYNCED'      ? 'success' :
                      p.pccSyncStatus === 'FAILED'      ? 'danger'  :
                      p.pccSyncStatus === 'IN_PROGRESS' ? 'info'    : 'warning'
                    }>
                      PCC: {p.pccSyncStatus}
                    </Badge>
                  ) : (
                    <span className="text-xs text-secondary-400">No PCC sync</span>
                  )}
                </div>
                <button
                  onClick={() => handleSyncPcc(p.id)}
                  disabled={syncing === p.id || p.pccSyncStatus === 'IN_PROGRESS'}
                  title={p.pccSyncStatus === 'SYNCED' ? 'Re-sync to PCC' : 'Sync to PCC'}
                  className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-30 transition"
                >
                  <FiRefreshCw size={13} className={syncing === p.id ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 dark:border-secondary-700">
            <p className="text-xs text-secondary-500">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg text-xs hover:bg-secondary-100 disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg text-xs hover:bg-secondary-100 disabled:opacity-30">Next</button>
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
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Identity &amp; Records</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="MRN (Medical Record Number)" required error={errors.mrn}>
                <input
                  value={form.mrn}
                  onChange={e => set('mrn', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. MRN-00123"
                  autoComplete="off"
                />
              </Field>
              <Field label="SSN (Social Security Number)" required error={errors.ssn}>
                <div className="relative">
                  <input
                    type={showSsn ? 'text' : 'password'}
                    value={form.ssn}
                    onChange={e => set('ssn', e.target.value)}
                    className={inputClass + ' pr-10'}
                    placeholder="123-45-6789"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSsn(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                    tabIndex={-1}
                  >
                    {showSsn ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">PCC Integration</h3>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.pccSyncRequired}
                onChange={e => set('pccSyncRequired', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-300">
                Sync this patient to PointClickCare (PCC) immediately after creation
                <span className="block text-xs text-secondary-400 mt-0.5">
                  Leave unchecked if PCC sync is not required for this patient.
                </span>
              </span>
            </label>
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
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Patient'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
