import { useState, useEffect, useCallback } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSave, FiEdit2, FiLock, FiSmartphone, FiLogOut, FiAlertCircle } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import DatePicker from '../../components/ui/DatePicker';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorState, LoadingState, Spinner } from '../../components/ui/States';
import { Field, inputClass, primaryBtn, secondaryBtn } from '../../components/ui/form';
import { toast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';
import { profileApi } from '../../services/patientService';
import { errorMessage, formatDate, humanize, initials, todayYmd } from '../../utils/format';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = [{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }];
const STATUS_BADGE = { ACTIVE: 'success', PENDING_REGISTRATION: 'warning', INACTIVE: 'gray' };

// Editable text fields and their limits (UpdatePatientProfileRequest).
const TEXT_FIELDS = {
  firstName: 50, lastName: 50, phone: 20, addressLine1: 255, addressLine2: 255, city: 100, state: 100,
  country: 100, zipCode: 20, bloodGroup: 10, emergencyContact: 500, allergies: 5000, chronicConditions: 5000,
  insuranceProvider: 200, policyNumber: 100,
};
const FIELDS = [...Object.keys(TEXT_FIELDS), 'dateOfBirth', 'gender'];
const PHONE_RE = /^[+\d\s\-()]{0,20}$/;

const toForm = (d) => FIELDS.reduce((f, k) => ({ ...f, [k]: d?.[k] ?? '' }), {});

function validate(form) {
  const e = {};
  if (!form.firstName.trim()) e.firstName = 'First name is required.';
  if (!form.lastName.trim()) e.lastName = 'Last name is required.';
  if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Use digits, spaces, +, - or brackets (max 20).';
  if (form.dateOfBirth && form.dateOfBirth > todayYmd()) e.dateOfBirth = 'Date of birth cannot be in the future.';
  Object.entries(TEXT_FIELDS).forEach(([k, max]) => { if (!e[k] && form[k].trim().length > max) e[k] = `Maximum ${max} characters.`; });
  return e;
}

/** Only the fields that changed. Text can be cleared (""); date of birth and gender cannot (the API ignores empty values). */
function diff(form, saved) {
  const out = {};
  Object.keys(TEXT_FIELDS).forEach((k) => {
    const v = form[k].trim();
    if (v !== (saved[k] || '').trim()) out[k] = v;
  });
  if (form.dateOfBirth && form.dateOfBirth !== saved.dateOfBirth) out.dateOfBirth = form.dateOfBirth;
  if (form.gender && form.gender !== saved.gender) out.gender = form.gender;
  return out;
}

export default function ProfilePage() {
  const accountAction = useAuthStore((s) => s.accountAction);
  const logout = useAuthStore((s) => s.logout);
  const accountEmail = useAuthStore((s) => s.user?.email);

  const [profile, setProfile] = useState(null);
  const [state, setState] = useState({ loading: true, error: null, notFound: false });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(toForm(null));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Loaded once on mount (and after saving) -- never on token refresh, so edits are not lost.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState({ loading: true, error: null, notFound: false });
    try {
      const data = await profileApi.get();
      setProfile(data);
      setForm(toForm(data));
      setState({ loading: false, error: null, notFound: false });
    } catch (err) {
      if (err?.response?.status === 404) setState({ loading: false, error: null, notFound: true });
      else setState({ loading: false, error: errorMessage(err, 'Could not load your profile.'), notFound: false });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const cancelEdit = () => { setForm(toForm(profile)); setErrors({}); setEditing(false); };

  const save = async () => {
    if (saving) return;
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) { toast.error('Please fix the highlighted fields.'); return; }
    const payload = diff(form, toForm(profile));
    if (!Object.keys(payload).length) { setEditing(false); toast.info('Nothing to save.'); return; }
    setSaving(true);
    try {
      await profileApi.update(payload);
      await load({ silent: true }); // show exactly what was stored
      setEditing(false);
      toast.success('Your profile was updated.');
    } catch (err) {
      const fe = err?.response?.data?.fieldErrors;
      if (fe && typeof fe === 'object') setErrors(fe);
      toast.error(errorMessage(err, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (state.loading) return <LoadingState label="Loading your profile…" />;

  if (state.notFound || state.error) {
    return (
      <div className="space-y-4">
        <PageHeader title="My profile" />
        <Card>
          {state.notFound ? (
            <div className="flex flex-col items-center text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-warning-50 dark:bg-warning-700/20 flex items-center justify-center mb-3"><FiAlertCircle className="text-warning-600" size={22} /></div>
              <h3 className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">No patient record is linked to this login</h3>
              <p className="text-xs text-secondary-500 mt-1 max-w-sm">You're signed in{accountEmail ? ` as ${accountEmail}` : ''}, but the hospital hasn't connected this account to a patient record yet. Please contact the hospital front desk.</p>
            </div>
          ) : <ErrorState message={state.error} onRetry={() => load()} />}
        </Card>
        <SecurityCard accountAction={accountAction} logout={logout} />
      </div>
    );
  }

  const p = profile || {};
  const view = (v) => (v ? <span className="break-words">{v}</span> : <span className="text-secondary-400">—</span>);
  const text = (k, label, opts = {}) => (
    <Field label={label} htmlFor={k} required={opts.required} error={errors[k]} className={opts.className}>
      {editing
        ? (opts.multiline
          ? <textarea id={k} value={form[k]} onChange={(e) => set(k, e.target.value)} maxLength={TEXT_FIELDS[k]} disabled={saving} placeholder={opts.placeholder} className={`${inputClass} h-20 resize-none`} />
          : <input id={k} value={form[k]} onChange={(e) => set(k, e.target.value)} maxLength={TEXT_FIELDS[k]} disabled={saving} placeholder={opts.placeholder} inputMode={opts.inputMode} autoComplete={opts.autoComplete} className={inputClass} />)
        : <p className="text-sm font-medium text-secondary-900 dark:text-white">{view(p[k])}</p>}
    </Field>
  );
  const bloodOptions = [{ value: '', label: 'Not set' }, ...[...BLOOD_GROUPS, ...(p.bloodGroup && !BLOOD_GROUPS.includes(p.bloodGroup) ? [p.bloodGroup] : [])].map((b) => ({ value: b, label: b }))];
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
  const listBadges = (s, variant) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => <Badge key={x} variant={variant}>{x}</Badge>) : null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="My profile"
        subtitle="Keep your contact and health details up to date."
        actions={!editing
          ? <button type="button" onClick={() => setEditing(true)} className={primaryBtn}><FiEdit2 size={15} /> Edit profile</button>
          : <>
              <button type="button" onClick={cancelEdit} disabled={saving} className={secondaryBtn}>Cancel</button>
              <button type="button" onClick={save} disabled={saving} className={primaryBtn}>{saving ? <Spinner size="sm" /> : <FiSave size={14} />} {saving ? 'Saving…' : 'Save'}</button>
            </>}
      />

      <Card>
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg shadow-primary-600/25 flex-shrink-0">
            {initials(p.firstName, p.lastName)}
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-secondary-900 dark:text-white truncate">{fullName || '—'}</h2>
            <p className="text-sm text-secondary-500 mt-0.5">Medical record no. <span className="font-mono font-medium text-secondary-700 dark:text-secondary-300">{p.mrn || 'not assigned yet'}</span></p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              {p.status && <Badge variant={STATUS_BADGE[p.status] || 'gray'} dot>{humanize(p.status)}</Badge>}
              {p.bloodGroup && <Badge variant="danger">Blood {p.bloodGroup}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="min-w-0">
          <CardHeader title="Personal information" />
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {text('firstName', 'First name', { required: true, autoComplete: 'given-name' })}
            {text('lastName', 'Last name', { required: true, autoComplete: 'family-name' })}
            <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth} hint={editing && p.dateOfBirth ? "Can be changed but not removed." : undefined}>
              {editing
                ? <DatePicker name="dateOfBirth" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} max={todayYmd()} clearable={false} disabled={saving} placeholder="Select date" />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white">{p.dateOfBirth ? formatDate(p.dateOfBirth, { day: 'numeric', month: 'long', year: 'numeric' }) : view(null)}</p>}
            </Field>
            <Field label="Gender" htmlFor="gender" error={errors.gender}>
              {editing
                ? <Select name="gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} options={GENDERS} placeholder="Select gender" disabled={saving} />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white">{view(GENDERS.find((g) => g.value === p.gender)?.label)}</p>}
            </Field>
            <Field label="Blood group" htmlFor="bloodGroup" error={errors.bloodGroup}>
              {editing
                ? <Select name="bloodGroup" value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} options={bloodOptions} disabled={saving} />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white">{view(p.bloodGroup)}</p>}
            </Field>
            <Field label="Email" hint={editing ? 'Contact the hospital to change your email.' : undefined}>
              <p className="text-sm font-medium text-secondary-900 dark:text-white flex items-center gap-2 min-w-0"><FiMail size={12} className="text-secondary-400 flex-shrink-0" /><span className="truncate">{p.email || '—'}</span></p>
            </Field>
            {editing ? text('phone', 'Phone', { inputMode: 'tel', autoComplete: 'tel', placeholder: '+91 98765 43210' }) : (
              <Field label="Phone"><p className="text-sm font-medium text-secondary-900 dark:text-white flex items-center gap-2"><FiPhone size={12} className="text-secondary-400" />{view(p.phone)}</p></Field>
            )}
            {text('emergencyContact', 'Emergency contact', { placeholder: 'Name and phone number', className: 'sm:col-span-2' })}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Address" />
          <div className="p-4 sm:p-5">
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {text('addressLine1', 'Address line 1', { className: 'sm:col-span-2', autoComplete: 'address-line1' })}
                {text('addressLine2', 'Address line 2', { className: 'sm:col-span-2', autoComplete: 'address-line2' })}
                {text('city', 'City', { autoComplete: 'address-level2' })}
                {text('state', 'State', { autoComplete: 'address-level1' })}
                {text('country', 'Country', { autoComplete: 'country-name' })}
                {text('zipCode', 'PIN / ZIP code', { autoComplete: 'postal-code', inputMode: 'numeric' })}
              </div>
            ) : (
              <p className="text-sm font-medium text-secondary-900 dark:text-white flex items-start gap-2">
                <FiMapPin size={13} className="text-secondary-400 mt-0.5 flex-shrink-0" />
                {view([p.addressLine1, p.addressLine2, p.city, p.state, p.zipCode, p.country].filter(Boolean).join(', '))}
              </p>
            )}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Medical information" subtitle="Separate items with commas." />
          <div className="p-4 sm:p-5 space-y-4">
            {editing ? text('allergies', 'Known allergies', { multiline: true, placeholder: 'e.g. Penicillin, Peanuts' }) : (
              <Field label="Known allergies"><div className="flex flex-wrap gap-2">{listBadges(p.allergies, 'danger') || <span className="text-sm text-secondary-400">None recorded</span>}</div></Field>
            )}
            {editing ? text('chronicConditions', 'Ongoing conditions', { multiline: true, placeholder: 'e.g. Asthma, Diabetes' }) : (
              <Field label="Ongoing conditions"><div className="flex flex-wrap gap-2">{listBadges(p.chronicConditions, 'warning') || <span className="text-sm text-secondary-400">None recorded</span>}</div></Field>
            )}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Insurance" />
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {text('insuranceProvider', 'Insurance provider')}
            {text('policyNumber', 'Policy number')}
          </div>
        </Card>
      </div>

      <SecurityCard accountAction={accountAction} logout={logout} />
    </div>
  );
}

function SecurityCard({ accountAction, logout }) {
  return (
    <Card>
      <CardHeader title="Sign-in & security" />
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button type="button" onClick={() => accountAction('UPDATE_PASSWORD')} className="flex items-center gap-3 p-3 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 text-left transition">
          <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0"><FiLock className="text-primary-600" size={16} /></div>
          <div className="min-w-0"><p className="text-sm font-medium text-secondary-900 dark:text-white">Change password</p><p className="text-xs text-secondary-500">On our secure sign-in page</p></div>
        </button>
        <button type="button" onClick={() => accountAction('CONFIGURE_TOTP')} className="flex items-center gap-3 p-3 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 text-left transition">
          <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0"><FiSmartphone className="text-primary-600" size={16} /></div>
          <div className="min-w-0"><p className="text-sm font-medium text-secondary-900 dark:text-white">Two-factor sign-in</p><p className="text-xs text-secondary-500">Set up an authenticator app</p></div>
        </button>
        <button type="button" onClick={logout} className="flex items-center gap-3 p-3 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-urgent-300 text-left transition">
          <div className="w-9 h-9 rounded-lg bg-urgent-50 dark:bg-urgent-900/20 flex items-center justify-center flex-shrink-0"><FiLogOut className="text-urgent-600" size={16} /></div>
          <div className="min-w-0"><p className="text-sm font-medium text-secondary-900 dark:text-white">Sign out</p><p className="text-xs text-secondary-500">End this session</p></div>
        </button>
      </div>
    </Card>
  );
}

