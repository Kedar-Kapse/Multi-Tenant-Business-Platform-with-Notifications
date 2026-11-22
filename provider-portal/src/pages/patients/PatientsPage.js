import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiUser, FiMail, FiPhone, FiEye, FiEyeOff, FiRefreshCw, FiCalendar, FiFileText, FiMessageSquare, FiUsers, FiX } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import DatePicker from '../../components/ui/DatePicker';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { ErrorState, Field, LoadingState, PageHeader, Pagination, Spinner } from '../../components/ui/States';
import { patientApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';
import useDebounce from '../../hooks/useDebounce';
import { errorMessage, fieldErrors, statusOf } from '../../utils/errors';
import { addDays, formatDate, formatDateTime, fullName, initials, titleCase, toYmd } from '../../utils/format';
import { btnGhost, btnPrimary, btnSecondary, inputClass } from '../../utils/styles';

const PAGE_SIZE = 12;
const GENDERS = [{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }];
const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_REGISTRATION', label: 'Pending registration' },
  { value: 'INACTIVE', label: 'Inactive' },
];
const STATUS_BADGE = { PENDING_REGISTRATION: 'warning', ACTIVE: 'success', INACTIVE: 'gray', DELETED: 'danger' };
const PCC_BADGE = { SYNCED: 'success', FAILED: 'danger', IN_PROGRESS: 'info', PENDING: 'warning' };

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '',
  mrn: '', ssn: '', addressLine1: '', addressLine2: '', city: '', state: '', country: '', zipCode: '',
  pccSyncRequired: false,
};

const statusText = (s) => (s === 'PENDING_REGISTRATION' ? 'Pending registration' : titleCase(s));

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-secondary-400">{label}</p>
      <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">{children || '—'}</p>
    </div>
  );
}

export default function PatientsPage() {
  const sub = useAuthStore((s) => s.user?.sub);
  const navigate = useNavigate();

  // One params object so a new search resets the page in the same update (one request, not two).
  const [params, setParams] = useState({ mine: true, query: '', status: '', page: 0 });
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim(), 350);
  const [result, setResult] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const reqId = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showSsn, setShowSsn] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [pccAllowed, setPccAllowed] = useState(true);

  useEffect(() => {
    setParams((p) => (p.query === debounced ? p : { ...p, query: debounced, page: 0 }));
  }, [debounced]);

  const load = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await patientApi.list({ page: params.page, size: PAGE_SIZE, query: params.query || undefined, status: params.status || undefined, mine: params.mine });
      if (my !== reqId.current) return;
      setResult({ content: data?.content || [], totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 });
    } catch (err) {
      if (my === reqId.current) setLoadError(errorMessage(err, 'Could not load patients.'));
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email';
    if (form.phone && !/^[+]?[0-9\-\s()]{7,20}$/.test(form.phone.trim())) e.phone = 'Invalid phone number';
    if (form.dateOfBirth && form.dateOfBirth >= toYmd(new Date())) e.dateOfBirth = 'Date of birth must be in the past';
    if (!form.mrn.trim()) e.mrn = 'MRN is required';
    if (!form.ssn.trim()) e.ssn = 'SSN is required';
    else if (!/^\d{3}-\d{2}-\d{4}$|^\d{9}$/.test(form.ssn.trim())) e.ssn = 'Format: 123-45-6789 or 9 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => { setForm(emptyForm); setErrors({}); setShowSsn(false); setModalOpen(true); };

  const handleSave = async () => {
    if (saving || !validate()) return;
    if (!sub) { toast.error('Your session has expired. Please sign in again.'); return; }
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => { payload[k] = typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v; });
      payload.pccSyncRequired = form.pccSyncRequired === true;
      const created = await patientApi.createForProvider(sub, payload);
      toast.success(`${fullName(created) || 'Patient'} added. A registration email has been sent.`);
      setModalOpen(false);
      setSearch('');
      // A new params object always triggers one reload (back to page 1 of My patients).
      setParams((p) => ({ ...p, mine: true, query: '', status: '', page: 0 }));
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      toast.error(statusOf(err) === 409 ? errorMessage(err, 'A patient with this email, MRN or SSN already exists.') : errorMessage(err, 'Could not create the patient.'));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (p) => {
    setDetail(p);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const full = await patientApi.getById(p.id);
      setDetail((d) => (d?.id === p.id ? full : d));
    } catch (err) {
      setDetailError(errorMessage(err, 'Could not load the full record.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSyncPcc = async (p) => {
    if (syncing) return;
    setSyncing(p.id);
    try {
      const updated = await patientApi.syncToPcc(p.id);
      toast.success('PCC sync started. The patient will be synced shortly.');
      if (updated?.id) setDetail((d) => (d?.id === updated.id ? { ...d, ...updated } : d));
      load();
    } catch (err) {
      if (statusOf(err) === 403) setPccAllowed(false);
      toast.error(errorMessage(err, 'Could not start the PCC sync.'));
    } finally {
      setSyncing(null);
    }
  };

  const goWith = (path, state) => { setDetail(null); navigate(path, { state }); };

  const subtitle = params.mine ? 'Patients linked to you.' : 'Every patient in the hospital.';
  const hasFilters = !!(params.query || params.status);

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Patients"
        subtitle={<>{subtitle}{!loading && result.totalElements > 0 && <span className="ml-1 text-secondary-400">({result.totalElements})</span>}</>}
        actions={<button type="button" onClick={openCreate} className={`${btnPrimary} w-full sm:w-auto`}><FiPlus size={16} /> Add patient</button>}
      />

      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-800 flex flex-col lg:flex-row lg:items-center gap-2 sm:gap-3">
          <Tabs
            tabs={[{ key: 'mine', label: 'My patients', icon: FiUser }, { key: 'all', label: 'All patients', icon: FiUsers }]}
            activeKey={params.mine ? 'mine' : 'all'}
            onChange={(k) => setParams((p) => ({ ...p, mine: k === 'mine', page: 0 }))}
          />
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or MRN…" className={`${inputClass} pl-9 pr-8`} aria-label="Search patients" />
              {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-secondary-400 hover:text-secondary-600"><FiX size={13} /></button>}
            </div>
            <div className="sm:w-52">
              <Select value={params.status} onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 0 }))} options={STATUS_FILTERS} aria-label="Status filter" />
            </div>
          </div>
        </div>

        {loadError ? <ErrorState title="Could not load patients" message={loadError} onRetry={load} />
          : loading && result.content.length === 0 ? <LoadingState />
            : result.content.length === 0 ? (
              <EmptyState
                icon={FiUser}
                title={hasFilters ? 'No patients match your search' : params.mine ? 'No patients linked to you yet' : 'No patients yet'}
                description={hasFilters ? 'Try a different name, email or status.' : 'Add a patient to register them and link them to you.'}
                action={hasFilters
                  ? <button type="button" onClick={() => { setSearch(''); setParams((p) => ({ ...p, query: '', status: '', page: 0 })); }} className={btnSecondary}>Clear filters</button>
                  : <button type="button" onClick={openCreate} className={btnPrimary}><FiPlus size={14} /> Add patient</button>}
              />
            ) : (
              <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                {result.content.map((p) => (
                  <button key={p.id} type="button" onClick={() => openDetail(p)}
                    className="text-left p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initials(p.firstName, p.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{fullName(p)}</p>
                        <Badge variant={STATUS_BADGE[p.status] || 'gray'} dot>{statusText(p.status)}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-secondary-500 dark:text-secondary-400">
                      <div className="flex items-center gap-2 min-w-0"><FiMail size={12} className="flex-shrink-0" /><span className="truncate">{p.email}</span></div>
                      {p.phone && <div className="flex items-center gap-2"><FiPhone size={12} className="flex-shrink-0" /><span className="truncate">{p.phone}</span></div>}
                      <div className="flex items-center justify-between gap-2 text-secondary-400">
                        <span className="font-mono truncate">{p.mrn ? `MRN ${p.mrn}` : ''}</span>
                        {p.dateOfBirth && <span className="flex-shrink-0">DOB {formatDate(p.dateOfBirth)}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

        <Pagination page={params.page} totalPages={result.totalPages} totalElements={result.totalElements} disabled={loading}
          onChange={(page) => setParams((p) => ({ ...p, page }))} />
      </Card>

      {/* Patient detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Patient record"
        size="lg"
        footer={detail && (
          <>
            <button type="button" onClick={() => goWith('/notes', { newNoteFor: detail })} className={btnSecondary}><FiFileText size={14} /> Write note</button>
            <button type="button" disabled={!detail.keycloakUserId} title={detail.keycloakUserId ? '' : 'The patient has not completed registration yet'}
              onClick={() => goWith('/messages', { composeTo: detail })} className={btnSecondary}><FiMessageSquare size={14} /> Message</button>
            <button type="button" disabled={!detail.keycloakUserId} title={detail.keycloakUserId ? '' : 'The patient has not completed registration yet'}
              onClick={() => goWith('/schedule', { bookFor: detail })} className={btnPrimary}><FiCalendar size={14} /> Book appointment</button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {initials(detail.firstName, detail.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white truncate">{fullName(detail)}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Badge variant={STATUS_BADGE[detail.status] || 'gray'} dot>{statusText(detail.status)}</Badge>
                  <Badge variant={detail.keycloakUserId ? 'teal' : 'gray'}>{detail.keycloakUserId ? 'Portal account' : 'No portal account yet'}</Badge>
                </div>
              </div>
              {detailLoading && <Spinner size="sm" />}
            </div>
            {detailError && <p className="text-xs text-urgent-600">{detailError}</p>}
            {!detail.keycloakUserId && (
              <p className="text-xs text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-700/20 rounded-lg px-3 py-2">
                This patient has not finished registration, so appointments and messages are not available yet.
              </p>
            )}

            <section>
              <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">Demographics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Detail label="Date of birth">{formatDate(detail.dateOfBirth)}</Detail>
                <Detail label="Gender">{titleCase(detail.gender)}</Detail>
                <Detail label="MRN"><span className="font-mono">{detail.mrn}</span></Detail>
                <Detail label="Email"><span className="break-all">{detail.email}</span></Detail>
                <Detail label="Phone">{detail.phone}</Detail>
                <Detail label="Blood group">{detail.bloodGroup}</Detail>
              </div>
            </section>

            <section>
              <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">Clinical</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Detail label="Allergies">{detail.allergies}</Detail>
                <Detail label="Chronic conditions">{detail.chronicConditions}</Detail>
                <Detail label="Emergency contact">{detail.emergencyContact}</Detail>
                <Detail label="Insurance">{[detail.insuranceProvider, detail.policyNumber].filter(Boolean).join(' · ')}</Detail>
              </div>
            </section>

            <section>
              <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">Address</h4>
              <p className="text-sm text-secondary-700 dark:text-secondary-300">
                {[detail.addressLine1, detail.addressLine2, detail.city, detail.state, detail.zipCode, detail.country].filter(Boolean).join(', ') || '—'}
              </p>
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-800/60">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-secondary-700 dark:text-secondary-200">PointClickCare</p>
                <p className="text-xs text-secondary-500 mt-0.5">
                  {detail.pccSyncStatus ? <Badge variant={PCC_BADGE[detail.pccSyncStatus] || 'warning'}>{titleCase(detail.pccSyncStatus)}</Badge> : 'Not synced'}
                  {detail.pccLastError && <span className="block text-urgent-600 mt-1 break-words">{detail.pccLastError}</span>}
                </p>
              </div>
              {pccAllowed && (
                <button type="button" onClick={() => handleSyncPcc(detail)} disabled={!!syncing || detail.pccSyncStatus === 'IN_PROGRESS'} className={btnSecondary}>
                  <FiRefreshCw size={13} className={syncing === detail.id ? 'animate-spin' : ''} />
                  {detail.pccSyncStatus === 'SYNCED' ? 'Re-sync' : 'Sync to PCC'}
                </button>
              )}
            </section>

            <p className="text-[11px] text-secondary-400">Added {formatDateTime(detail.createdAt)}{detail.registrationCompletedAt ? ` · registered ${formatDateTime(detail.registrationCompletedAt)}` : ''}</p>
          </div>
        )}
      </Modal>

      {/* Add patient */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title="Add patient"
        size="lg"
        footer={(
          <>
            <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className={btnGhost}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving ? <><Spinner size="sm" className="border-white border-t-transparent" /> Saving…</> : 'Create patient'}
            </button>
          </>
        )}
      >
        <div className="space-y-5">
          <section>
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Patient information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First name" required error={errors.firstName}>
                <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} maxLength={50} className={inputClass} />
              </Field>
              <Field label="Last name" required error={errors.lastName}>
                <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} maxLength={50} className={inputClass} />
              </Field>
              <Field label="Email" required error={errors.email} hint="The registration link is sent here.">
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={100} className={inputClass} placeholder="patient@example.com" />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} placeholder="+1 555 123 4567" />
              </Field>
              <Field label="Date of birth" error={errors.dateOfBirth}>
                <DatePicker name="dateOfBirth" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} max={toYmd(addDays(new Date(), -1))} error={errors.dateOfBirth} touched />
              </Field>
              <Field label="Gender" error={errors.gender}>
                <Select name="gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} placeholder="Select gender" options={[{ value: '', label: 'Not specified' }, ...GENDERS]} />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Identity &amp; records</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="MRN (medical record number)" required error={errors.mrn}>
                <input value={form.mrn} onChange={(e) => set('mrn', e.target.value)} maxLength={50} className={inputClass} placeholder="e.g. MRN-00123" autoComplete="off" />
              </Field>
              <Field label="SSN" required error={errors.ssn} hint="Stored encrypted; never shown again.">
                <div className="relative">
                  <input type={showSsn ? 'text' : 'password'} value={form.ssn} onChange={(e) => set('ssn', e.target.value)} className={`${inputClass} pr-10`} placeholder="123-45-6789" autoComplete="off" />
                  <button type="button" onClick={() => setShowSsn((v) => !v)} aria-label={showSsn ? 'Hide SSN' : 'Show SSN'} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600" tabIndex={-1}>
                    {showSsn ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Address (optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Address line 1" className="sm:col-span-2" error={errors.addressLine1}><input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} maxLength={255} className={inputClass} /></Field>
              <Field label="Address line 2" className="sm:col-span-2" error={errors.addressLine2}><input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} maxLength={255} className={inputClass} /></Field>
              <Field label="City" error={errors.city}><input value={form.city} onChange={(e) => set('city', e.target.value)} maxLength={100} className={inputClass} /></Field>
              <Field label="State" error={errors.state}><input value={form.state} onChange={(e) => set('state', e.target.value)} maxLength={100} className={inputClass} /></Field>
              <Field label="Country" error={errors.country}><input value={form.country} onChange={(e) => set('country', e.target.value)} maxLength={100} className={inputClass} /></Field>
              <Field label="ZIP / postal code" error={errors.zipCode}><input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} maxLength={20} className={inputClass} /></Field>
            </div>
          </section>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={form.pccSyncRequired} onChange={(e) => set('pccSyncRequired', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-secondary-700 dark:text-secondary-300">
              Sync to PointClickCare (PCC) right after creating
              <span className="block text-xs text-secondary-400 mt-0.5">Leave unchecked if this patient does not need PCC.</span>
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
