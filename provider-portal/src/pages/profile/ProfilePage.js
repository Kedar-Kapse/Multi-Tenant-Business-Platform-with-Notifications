import { useCallback, useEffect, useState } from 'react';
import { FiMail, FiPhone, FiShield, FiMapPin, FiSave, FiEdit2, FiKey, FiSmartphone, FiUserX } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { ErrorState, Field, LoadingState, PageHeader, Spinner } from '../../components/ui/States';
import { mfaApi, profileApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';
import keycloak from '../../keycloak';
import { errorMessage, fieldErrors, statusOf } from '../../utils/errors';
import { titleCase } from '../../utils/format';
import { btnGhost, btnPrimary, btnSecondary, inputClass } from '../../utils/styles';

const EDITABLE = ['phone', 'specialization', 'licenseNumber', 'experienceYears', 'addressLine1', 'addressLine2', 'city', 'state', 'country', 'zipCode'];
const STATUS_BADGE = { ACTIVE: 'success', INACTIVE: 'gray', SUSPENDED: 'danger', ON_LEAVE: 'warning', PENDING: 'warning' };

const toForm = (p) => Object.fromEntries(EDITABLE.map((k) => [k, p?.[k] == null ? '' : String(p[k])]));

function Item({ label, icon: Icon, children, mono }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-secondary-500 mb-1">{label}</p>
      <p className={`text-sm font-medium text-secondary-900 dark:text-white flex items-center gap-2 min-w-0 ${mono ? 'font-mono' : ''}`}>
        {Icon && <Icon size={12} className="text-secondary-400 flex-shrink-0" />}
        <span className="truncate">{children || '—'}</span>
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(toForm(null));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [mfa, setMfa] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    setLoadError(null);
    try {
      const p = await profileApi.getMe();
      setProfile(p);
      setForm(toForm(p));
      setState('ready');
    } catch (err) {
      if (statusOf(err) === 404) setState('missing');
      else { setLoadError(errorMessage(err, 'Could not load your profile.')); setState('error'); }
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { mfaApi.status().then(setMfa).catch(() => setMfa(null)); }, []);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const validate = () => {
    const e = {};
    if (form.phone.trim() && !/^[+]?[0-9\-\s()]{7,20}$/.test(form.phone.trim())) e.phone = 'Invalid phone number';
    if (form.experienceYears !== '') {
      const n = Number(form.experienceYears);
      if (!Number.isInteger(n) || n < 0 || n > 70) e.experienceYears = 'Enter whole years between 0 and 70';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (saving || !validate()) return;
    // Only send what changed. An empty string clears a text field.
    const body = {};
    const before = toForm(profile);
    EDITABLE.forEach((k) => {
      if (form[k] === before[k]) return;
      if (k === 'experienceYears') { if (form[k] !== '') body[k] = Number(form[k]); }
      else body[k] = form[k].trim();
    });
    if (Object.keys(body).length === 0) { setEditing(false); return; }
    setSaving(true);
    try {
      const updated = await profileApi.updateMe(body);
      setProfile(updated);
      setForm(toForm(updated));
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      toast.error(errorMessage(err, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => { setForm(toForm(profile)); setErrors({}); setEditing(false); };
  const redirectUri = `${window.location.origin}/profile`;
  const changePassword = () => keycloak.login({ action: 'UPDATE_PASSWORD', redirectUri });
  const setupTotp = () => keycloak.login({ action: 'CONFIGURE_TOTP', redirectUri });

  const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : user?.fullName;
  const role = titleCase(profile?.role || user?.primaryRole);
  const initials = `${(profile?.firstName || user?.firstName || 'P')[0]}${(profile?.lastName || user?.lastName || '')[0] || ''}`.toUpperCase();
  const region = profile ? [profile.city, profile.state, profile.country].filter(Boolean).join(', ') : '';
  const address = profile ? [profile.addressLine1, profile.addressLine2].filter(Boolean).join(', ') : '';

  const security = (
    <Card>
      <CardHeader title="Sign-in & security" subtitle="Managed by the hospital's secure sign-in service" />
      <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0"><FiKey className="text-primary-600" size={18} /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-secondary-900 dark:text-white">Password</p>
              <p className="text-xs text-secondary-500">You will be taken to the sign-in page to choose a new password.</p>
            </div>
          </div>
          <button type="button" onClick={changePassword} className={btnSecondary}>Change password</button>
        </div>
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0"><FiSmartphone className="text-primary-600" size={18} /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-secondary-900 dark:text-white flex flex-wrap items-center gap-2">
                Two-factor authentication
                {mfa && <Badge variant={mfa.enabled ? 'success' : 'warning'} dot>{mfa.enabled ? 'On' : 'Off'}</Badge>}
              </p>
              <p className="text-xs text-secondary-500">
                {mfa?.enabled ? 'An authenticator app code is required when you sign in.' : 'Protect patient data with a code from an authenticator app.'}
                {mfa?.totpRequired && !mfa?.enabled && ' Your hospital requires it.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={setupTotp} className={mfa?.enabled ? btnSecondary : btnPrimary}>
            {mfa?.enabled ? 'Add another device' : 'Set up two-factor'}
          </button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Profile"
        subtitle="Your professional details and account security."
        actions={state === 'ready' && (!editing ? (
          <button type="button" onClick={() => setEditing(true)} className={`${btnPrimary} w-full sm:w-auto`}><FiEdit2 size={14} /> Edit profile</button>
        ) : (
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="button" onClick={cancelEdit} disabled={saving} className={`${btnGhost} flex-1 sm:flex-none`}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className={`${btnPrimary} flex-1 sm:flex-none`}>
              {saving ? <><Spinner size="sm" className="border-white border-t-transparent" /> Saving…</> : <><FiSave size={14} /> Save</>}
            </button>
          </div>
        ))}
      />

      {state === 'loading' && <Card><LoadingState /></Card>}
      {state === 'error' && <Card><ErrorState title="Could not load your profile" message={loadError} onRetry={load} /></Card>}
      {state === 'missing' && (
        <Card>
          <EmptyState
            icon={FiUserX}
            title="No staff profile for this login"
            description={`You are signed in as ${user?.username || user?.email || 'this user'}, but the hospital has no staff record linked to it yet. Ask an administrator to add you as staff; your contact and professional details will appear here.`}
          />
        </Card>
      )}

      {(state === 'ready' || state === 'missing') && (
        <Card>
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-600/25 flex-shrink-0">
              {initials}
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white truncate">{name || user?.username}</h2>
              <p className="text-sm text-secondary-500 mt-0.5 truncate">
                {[profile?.specialization, profile?.experienceYears != null ? `${profile.experienceYears} years experience` : null].filter(Boolean).join(' · ') || role}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                {role && <Badge variant="teal">{role}</Badge>}
                {profile?.status && <Badge variant={STATUS_BADGE[profile.status] || 'gray'} dot>{titleCase(profile.status)}</Badge>}
              </div>
            </div>
            {profile?.licenseNumber && (
              <div className="text-center sm:text-right">
                <p className="text-xs text-secondary-400">License #</p>
                <p className="text-sm font-mono font-semibold text-secondary-700 dark:text-secondary-300">{profile.licenseNumber}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {state === 'ready' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Contact" subtitle="Name and email are managed by your administrator" />
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Item label="First name">{profile.firstName}</Item>
              <Item label="Last name">{profile.lastName}</Item>
              <Item label="Email" icon={FiMail}><span title={profile.email}>{profile.email}</span></Item>
              {editing ? (
                <Field label="Phone" error={errors.phone}>
                  <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} placeholder="+1 555 123 4567" />
                </Field>
              ) : <Item label="Phone" icon={FiPhone}>{profile.phone}</Item>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Professional details" />
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editing ? (
                <>
                  <Field label="Specialization" error={errors.specialization}>
                    <input value={form.specialization} onChange={(e) => set('specialization', e.target.value)} maxLength={100} className={inputClass} />
                  </Field>
                  <Field label="License number" error={errors.licenseNumber}>
                    <input value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} maxLength={50} className={inputClass} />
                  </Field>
                  <Field label="Experience (years)" error={errors.experienceYears}>
                    <input type="number" inputMode="numeric" min="0" max="70" value={form.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} className={inputClass} />
                  </Field>
                </>
              ) : (
                <>
                  <Item label="Specialization">{profile.specialization}</Item>
                  <Item label="License number" mono>{profile.licenseNumber}</Item>
                  <Item label="Experience">{profile.experienceYears != null ? `${profile.experienceYears} years` : null}</Item>
                </>
              )}
              <Item label="Role">{role}</Item>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Address" />
            <div className="p-4 sm:p-5">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Address line 1" className="sm:col-span-2" error={errors.addressLine1}><input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} maxLength={255} className={inputClass} /></Field>
                  <Field label="Address line 2" className="sm:col-span-2" error={errors.addressLine2}><input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} maxLength={255} className={inputClass} /></Field>
                  <Field label="City" error={errors.city}><input value={form.city} onChange={(e) => set('city', e.target.value)} maxLength={100} className={inputClass} /></Field>
                  <Field label="State" error={errors.state}><input value={form.state} onChange={(e) => set('state', e.target.value)} maxLength={100} className={inputClass} /></Field>
                  <Field label="Country" error={errors.country}><input value={form.country} onChange={(e) => set('country', e.target.value)} maxLength={100} className={inputClass} /></Field>
                  <Field label="ZIP / postal code" error={errors.zipCode}><input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} maxLength={20} className={inputClass} /></Field>
                  <p className="sm:col-span-2 text-[11px] text-secondary-400">Leave a field empty to remove it.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Item label="Street" icon={FiMapPin}>{address}</Item>
                  <Item label="City / region">{[region, profile.zipCode].filter(Boolean).join(' ')}</Item>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {security}

      <p className="text-[11px] text-secondary-400 flex items-center gap-1.5"><FiShield size={12} /> Your session is encrypted. Signed in as {user?.username}.</p>
    </div>
  );
}
