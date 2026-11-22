import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiSun, FiMoon, FiMonitor, FiLock, FiShield, FiClock, FiSave, FiKey, FiSmartphone } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import useThemeStore from '../../store/themeStore';
import settingsService from '../../services/settingsService';
import { toast } from '../../components/ui/Toast';
import cn from '../../utils/cn';

const THEMES = [
  { key: 'light', label: 'Light', icon: FiSun },
  { key: 'dark', label: 'Dark', icon: FiMoon },
  { key: 'system', label: 'System', icon: FiMonitor },
];

const TABS = [
  { key: 'appearance', label: 'Appearance', icon: FiSun },
  { key: 'account', label: 'My Account', icon: FiLock },
  { key: 'policy', label: 'Password Policy', icon: FiShield },
  { key: 'sessions', label: 'Sign-in Security', icon: FiClock },
];

const inputCls = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none';

export default function SettingsPage() {
  const [tab, setTab] = useState('appearance');
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Settings</h1>
        <p className="text-sm text-secondary-500 mt-0.5">Your account and your hospital's security rules.</p>
      </div>
      <Tabs tabs={TABS} activeKey={tab} onChange={setTab} />
      {tab === 'appearance' && <Appearance />}
      {tab === 'account' && <Account />}
      {tab === 'policy' && <PasswordPolicy />}
      {tab === 'sessions' && <SignInSecurity />}
    </div>
  );
}

function Appearance() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  return (
    <Card>
      <CardHeader title="Appearance" subtitle="Saved on this device." />
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {THEMES.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setTheme(key)}
            className={cn('flex items-center gap-3 p-4 rounded-xl border-2 text-left transition',
              theme === key ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600')}>
            <Icon size={18} className={theme === key ? 'text-primary-600' : 'text-secondary-400'} />
            <span className="text-sm font-medium text-secondary-900 dark:text-white">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function Account() {
  return (
    <Card>
      <CardHeader title="My Account" subtitle="Changes happen on the secure sign-in screen and you come straight back." />
      <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <FiKey className="text-secondary-400 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">Password</p>
              <p className="text-xs text-secondary-500">Choose a new password. It must follow your hospital's password policy.</p>
            </div>
          </div>
          <button type="button" onClick={() => settingsService.changePassword()}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition self-start sm:self-auto">
            Change password
          </button>
        </div>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <FiSmartphone className="text-secondary-400 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">Two-factor login</p>
              <p className="text-xs text-secondary-500">A code from your phone at every sign-in.</p>
            </div>
          </div>
          <Link to="/mfa" className="px-4 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm font-medium transition self-start sm:self-auto">
            Manage
          </Link>
        </div>
      </div>
    </Card>
  );
}

/** Loads a settings object, lets the form edit a copy, saves it back. */
function useSettingsForm(load) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const reload = useCallback(async () => {
    setError(null);
    try { setData(await load()); } catch (e) { setError(e.response?.data?.message || 'Could not load settings.'); }
  }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return { data, setData, error, saving, setSaving, reload };
}

function PasswordPolicy() {
  const { data, setData, error, saving, setSaving, reload } = useSettingsForm(settingsService.passwordPolicy.get);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      setData(await settingsService.passwordPolicy.update(data));
      toast.success('Password policy saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the password policy');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Card><EmptyState icon={FiShield} title="Couldn't load the policy" description={error} action={<RetryButton onClick={reload} />} /></Card>;
  if (!data) return <Card><div className="p-10 text-center text-sm text-secondary-400">Loading…</div></Card>;

  const set = (k, v) => setData({ ...data, [k]: v });
  return (
    <Card>
      <CardHeader title="Password Policy" subtitle="Applies to everyone in your hospital the next time they set a password." />
      <form onSubmit={save} className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField label="Minimum length" min={6} max={128} value={data.minLength} onChange={(v) => set('minLength', v)} />
          <NumberField label="Remember last N passwords" hint="0 = off" min={0} max={24} value={data.passwordHistory} onChange={(v) => set('passwordHistory', v)} />
          <NumberField label="Expire after (days)" hint="0 = never" min={0} max={3650} value={data.expireDays} onChange={(v) => set('expireDays', v)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Toggle label="Require an upper-case letter" checked={data.requireUppercase} onChange={(v) => set('requireUppercase', v)} />
          <Toggle label="Require a lower-case letter" checked={data.requireLowercase} onChange={(v) => set('requireLowercase', v)} />
          <Toggle label="Require a digit" checked={data.requireDigits} onChange={(v) => set('requireDigits', v)} />
          <Toggle label="Require a special character" checked={data.requireSpecial} onChange={(v) => set('requireSpecial', v)} />
          <Toggle label="Must not be the username" checked={data.notUsername} onChange={(v) => set('notUsername', v)} />
        </div>
        <SaveButton saving={saving} />
      </form>
    </Card>
  );
}

function SignInSecurity() {
  const { data, setData, error, saving, setSaving, reload } = useSettingsForm(settingsService.securitySettings.get);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      setData(await settingsService.securitySettings.update(data));
      toast.success('Sign-in security saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save sign-in security');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Card><EmptyState icon={FiClock} title="Couldn't load settings" description={error} action={<RetryButton onClick={reload} />} /></Card>;
  if (!data) return <Card><div className="p-10 text-center text-sm text-secondary-400">Loading…</div></Card>;

  const set = (k, v) => setData({ ...data, [k]: v });
  return (
    <Card>
      <CardHeader title="Sign-in Security" subtitle="Session length and lock-out after failed logins, for everyone in your hospital." />
      <form onSubmit={save} className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField label="Sign out when idle (minutes)" min={5} max={480} value={data.sessionIdleMinutes ?? 30} onChange={(v) => set('sessionIdleMinutes', v)} />
          <NumberField label="Longest session (hours)" min={1} max={72} value={data.sessionMaxHours ?? 10} onChange={(v) => set('sessionMaxHours', v)} />
          <NumberField label="Failed logins before lock-out" min={3} max={30} value={data.maxLoginFailures ?? 5} onChange={(v) => set('maxLoginFailures', v)} disabled={!data.bruteForceProtected} />
        </div>
        <Toggle label="Lock accounts after repeated failed logins" checked={!!data.bruteForceProtected} onChange={(v) => set('bruteForceProtected', v)} />
        <SaveButton saving={saving} />
      </form>
    </Card>
  );
}

function NumberField({ label, hint, value, onChange, min, max, disabled }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        {label} {hint && <span className="text-secondary-400 font-normal">({hint})</span>}
      </span>
      <input type="number" inputMode="numeric" min={min} max={max} required disabled={disabled}
        value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={cn(inputCls, disabled && 'opacity-50')} />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 w-full p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition text-left">
      <span className="text-sm text-secondary-700 dark:text-secondary-200">{label}</span>
      <span className={cn('relative w-9 h-5 rounded-full transition flex-shrink-0', checked ? 'bg-primary-600' : 'bg-secondary-300 dark:bg-secondary-600')}>
        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

function SaveButton({ saving }) {
  return (
    <button type="submit" disabled={saving}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
      <FiSave size={14} /> {saving ? 'Saving…' : 'Save'}
    </button>
  );
}

function RetryButton({ onClick }) {
  return <button onClick={onClick} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm">Try again</button>;
}
