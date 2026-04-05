import { useState, useEffect, useCallback } from 'react';
import { FiSun, FiMoon, FiMonitor, FiLock, FiSave, FiShield, FiClock, FiBell } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
// Badge available for future use
import Tabs from '../../components/ui/Tabs';
import { toast } from '../../components/ui/Toast';
import useThemeStore from '../../store/themeStore';
import settingsService from '../../services/settingsService';
import { getPasswordStrength } from '../../utils/validators';

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: FiSun },
  { key: 'dark', label: 'Dark', icon: FiMoon },
  { key: 'system', label: 'System', icon: FiMonitor },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('appearance');
  const { theme, setTheme } = useThemeStore();
  const [passwordForm, setPasswordForm] = useState({ current: '', newPassword: '', confirm: '' });
  const [passwordPolicy, setPasswordPolicy] = useState({ minLength: 8, requireUpper: true, requireLower: true, requireNumber: true, requireSpecial: true, maxAge: 90 });
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: false, inApp: true, alertsOnly: false });

  const loadPasswordPolicy = useCallback(async () => {
    try {
      const data = await settingsService.passwordPolicy.get();
      if (data) setPasswordPolicy(data);
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => { loadPasswordPolicy(); }, [loadPasswordPolicy]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    const strength = getPasswordStrength(passwordForm.newPassword);
    if (strength.score < 4) {
      toast.warning('Password is too weak. Use at least 8 characters with upper, lower, number, and special character.');
      return;
    }
    setSaving(true);
    try {
      await settingsService.changePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.newPassword });
      toast.success('Password changed successfully');
      setPasswordForm({ current: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      await settingsService.passwordPolicy.update(passwordPolicy);
      toast.success('Password policy updated');
    } catch {
      toast.error('Failed to update password policy');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    if (newTheme === 'system') {
      const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(preferred);
    } else {
      setTheme(newTheme);
    }
  };

  const strength = getPasswordStrength(passwordForm.newPassword);

  const TABS = [
    { key: 'appearance', label: 'Appearance', icon: FiSun },
    { key: 'password', label: 'Password', icon: FiLock },
    { key: 'policy', label: 'Password Policy', icon: FiShield },
    { key: 'notifications', label: 'Notifications', icon: FiBell },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Settings</h1>
        <p className="text-sm text-secondary-500 mt-0.5">System configuration, appearance, and security policies.</p>
      </div>

      <Tabs tabs={TABS} activeKey={tab} onChange={setTab} />

      {/* Appearance */}
      {tab === 'appearance' && (
        <Card>
          <CardHeader title="Theme & Appearance" subtitle="Customize the look and feel of your dashboard" />
          <div className="p-5 space-y-6">
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-3">Color Theme</label>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {THEME_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = theme === opt.key || (opt.key === 'system' && theme !== 'light' && theme !== 'dark');
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleThemeChange(opt.key)}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${
                        active ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300'
                      }`}
                    >
                      <Icon size={20} className={active ? 'text-primary-600' : 'text-secondary-500'} />
                      <span className={`text-xs font-medium ${active ? 'text-primary-700 dark:text-primary-400' : 'text-secondary-600 dark:text-secondary-400'}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-2">Session Timeout</label>
              <div className="flex items-center gap-3 max-w-xs">
                <FiClock className="text-secondary-400" size={16} />
                <select defaultValue="15" className="flex-1 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes (HIPAA default)</option>
                  <option value="30">30 minutes</option>
                </select>
              </div>
              <p className="text-[10px] text-secondary-400 mt-1.5">HIPAA §164.312(a)(2)(iii) requires automatic logoff.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Change Password */}
      {tab === 'password' && (
        <Card>
          <CardHeader title="Change Password" subtitle="Update your account password" />
          <form onSubmit={handleChangePassword} className="p-5 space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Current Password</label>
              <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">New Password</label>
              <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
              {passwordForm.newPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-${strength.color}-500 transition-all`} style={{ width: `${(strength.score / 6) * 100}%` }} />
                  </div>
                  <span className={`text-[10px] font-medium text-${strength.color}-600`}>{strength.label}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Confirm New Password</label>
              <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
              {passwordForm.confirm && passwordForm.confirm !== passwordForm.newPassword && (
                <p className="text-[11px] text-urgent-600 mt-1">Passwords do not match</p>
              )}
            </div>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
              {saving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </Card>
      )}

      {/* Password Policy */}
      {tab === 'policy' && (
        <Card>
          <CardHeader title="Password Policy" subtitle="Define password requirements for all users" />
          <div className="p-5 space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Minimum Length</label>
              <input type="number" min={6} max={32} value={passwordPolicy.minLength} onChange={(e) => setPasswordPolicy({ ...passwordPolicy, minLength: parseInt(e.target.value) })} className="w-24 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
            </div>
            {[
              { key: 'requireUpper', label: 'Require uppercase letter' },
              { key: 'requireLower', label: 'Require lowercase letter' },
              { key: 'requireNumber', label: 'Require number' },
              { key: 'requireSpecial', label: 'Require special character' },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center gap-3">
                <input type="checkbox" id={opt.key} checked={passwordPolicy[opt.key]} onChange={(e) => setPasswordPolicy({ ...passwordPolicy, [opt.key]: e.target.checked })} className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                <label htmlFor={opt.key} className="text-sm text-secondary-700 dark:text-secondary-300">{opt.label}</label>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Password Expiry (days)</label>
              <input type="number" min={0} max={365} value={passwordPolicy.maxAge} onChange={(e) => setPasswordPolicy({ ...passwordPolicy, maxAge: parseInt(e.target.value) })} className="w-24 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
              <p className="text-[10px] text-secondary-400 mt-1">Set to 0 for no expiry. HIPAA recommends 90 days.</p>
            </div>
            <button onClick={handleSavePolicy} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
              <FiSave size={14} /> {saving ? 'Saving…' : 'Save Policy'}
            </button>
          </div>
        </Card>
      )}

      {/* Notification Preferences */}
      {tab === 'notifications' && (
        <Card>
          <CardHeader title="Notification Preferences" subtitle="Choose how you receive alerts and updates" />
          <div className="p-5 space-y-4 max-w-md">
            {[
              { key: 'email', label: 'Email Notifications', desc: 'Receive alerts and reports via email' },
              { key: 'sms', label: 'SMS Notifications', desc: 'Get critical alerts via text message' },
              { key: 'inApp', label: 'In-App Notifications', desc: 'Show notifications in the admin portal' },
              { key: 'alertsOnly', label: 'Critical Alerts Only', desc: 'Only receive high-priority notifications' },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center justify-between p-3 rounded-xl border border-secondary-200 dark:border-secondary-700">
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-secondary-500 mt-0.5">{opt.desc}</p>
                </div>
                <button
                  onClick={() => setNotifPrefs({ ...notifPrefs, [opt.key]: !notifPrefs[opt.key] })}
                  className={`relative w-10 h-5 rounded-full transition ${notifPrefs[opt.key] ? 'bg-primary-600' : 'bg-secondary-300 dark:bg-secondary-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifPrefs[opt.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">
              <FiSave size={14} /> Save Preferences
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
