import { useState, useEffect, useCallback } from 'react';
import { FiShield, FiSmartphone, FiMail, FiKey } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { toast } from '../../../components/ui/Toast';
import settingsService from '../../../services/settingsService';

const MFA_METHODS = [
  { key: 'totp', label: 'Authenticator App', icon: FiSmartphone, desc: 'Use Google Authenticator, Authy, or similar app to generate time-based codes.' },
  { key: 'email', label: 'Email Verification', icon: FiMail, desc: 'Receive a verification code via email for each login attempt.' },
  { key: 'recovery', label: 'Recovery Codes', icon: FiKey, desc: 'One-time backup codes for emergency access when other methods are unavailable.' },
];

export default function MfaPage() {
  const [status, setStatus] = useState({ enabled: false, method: null });
  const [loading, setLoading] = useState(true);
  const [setupModal, setSetupModal] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsService.mfa.getStatus();
      setStatus(data);
    } catch {
      setStatus({ enabled: false, method: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEnable = async (method) => {
    try {
      if (method === 'totp') {
        const data = await settingsService.mfa.getQRCode();
        setQrCode(data.qrCode || data.qr_code || data.uri);
        setSetupModal('totp');
      } else if (method === 'email') {
        await settingsService.mfa.enable('email');
        setSetupModal('email');
      } else if (method === 'recovery') {
        const data = await settingsService.mfa.getRecoveryCodes();
        setRecoveryCodes(data.codes || data);
        setSetupModal('recovery');
      }
    } catch (err) {
      toast.error('Failed to initialize MFA setup');
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await settingsService.mfa.verifySetup(verifyCode);
      toast.success('MFA enabled successfully');
      setSetupModal(null);
      setVerifyCode('');
      load();
    } catch {
      toast.error('Invalid verification code');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    try {
      await settingsService.mfa.disable();
      toast.success('MFA disabled');
      load();
    } catch {
      toast.error('Failed to disable MFA');
    }
  };

  if (loading) return <div className="p-12 text-center text-secondary-400">Loading MFA settings…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Multi-Factor Authentication</h1>
        <p className="text-sm text-secondary-500 mt-0.5">Strengthen your account security with additional verification.</p>
      </div>

      {/* Status Card */}
      <Card>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.enabled ? 'bg-success-100 dark:bg-success-900/30' : 'bg-warning-100 dark:bg-warning-900/30'}`}>
              <FiShield className={status.enabled ? 'text-success-600' : 'text-warning-600'} size={22} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">MFA Status</h3>
              <p className="text-xs text-secondary-500 mt-0.5">
                {status.enabled ? `Protected with ${status.method === 'totp' ? 'Authenticator App' : 'Email Verification'}` : 'Your account is not protected by MFA'}
              </p>
            </div>
          </div>
          <Badge variant={status.enabled ? 'success' : 'warning'} dot>
            {status.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </Card>

      {/* HIPAA Notice */}
      <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 flex items-center gap-3">
        <FiShield className="text-primary-600 flex-shrink-0" size={16} />
        <p className="text-xs text-primary-700 dark:text-primary-400">HIPAA §164.312(d) requires multi-factor authentication for accessing systems containing PHI. Enable MFA to maintain compliance.</p>
      </div>

      {/* MFA Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MFA_METHODS.map((method) => {
          const Icon = method.icon;
          const isActive = status.enabled && status.method === method.key;
          return (
            <Card key={method.key}>
              <div className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-success-100 dark:bg-success-900/30' : 'bg-secondary-100 dark:bg-secondary-800'}`}>
                    <Icon className={isActive ? 'text-success-600' : 'text-secondary-500'} size={18} />
                  </div>
                  {isActive && <Badge variant="success" dot>Active</Badge>}
                </div>
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{method.label}</h3>
                <p className="text-xs text-secondary-500 mt-1 flex-1">{method.desc}</p>
                <div className="mt-4">
                  {isActive ? (
                    <button onClick={handleDisable} className="w-full px-3 py-2 rounded-lg border border-urgent-200 dark:border-urgent-800 text-urgent-600 text-sm font-medium hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition">
                      Disable
                    </button>
                  ) : (
                    <button onClick={() => handleEnable(method.key)} className="w-full px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">
                      {method.key === 'recovery' ? 'Generate Codes' : 'Enable'}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* TOTP Setup Modal */}
      <Modal open={setupModal === 'totp'} onClose={() => setSetupModal(null)} title="Set Up Authenticator App">
        <div className="space-y-4">
          <p className="text-sm text-secondary-600 dark:text-secondary-400">Scan this QR code with your authenticator app, then enter the 6-digit verification code.</p>
          {qrCode && (
            <div className="flex justify-center p-4 bg-white rounded-xl">
              <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Verification Code</label>
            <input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-center text-lg font-mono tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setSetupModal(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">Cancel</button>
            <button onClick={handleVerify} disabled={verifyCode.length < 6 || verifying} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
              {verifying ? 'Verifying…' : 'Verify & Enable'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Email Setup Modal */}
      <Modal open={setupModal === 'email'} onClose={() => setSetupModal(null)} title="Email Verification Setup">
        <div className="space-y-4">
          <p className="text-sm text-secondary-600 dark:text-secondary-400">A verification code has been sent to your registered email. Enter it below to complete setup.</p>
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Verification Code</label>
            <input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-center text-lg font-mono tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setSetupModal(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">Cancel</button>
            <button onClick={handleVerify} disabled={verifyCode.length < 6 || verifying} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
              {verifying ? 'Verifying…' : 'Verify & Enable'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Recovery Codes Modal */}
      <Modal open={setupModal === 'recovery'} onClose={() => setSetupModal(null)} title="Recovery Codes">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
            <p className="text-xs text-warning-700 dark:text-warning-400 font-medium">Save these codes in a secure location. Each code can only be used once.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
            {recoveryCodes.map((code, i) => (
              <div key={i} className="font-mono text-sm text-secondary-700 dark:text-secondary-300 py-1">{code}</div>
            ))}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(recoveryCodes.join('\n')); toast.success('Codes copied to clipboard'); }} className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition">
            Copy All Codes
          </button>
        </div>
      </Modal>
    </div>
  );
}
