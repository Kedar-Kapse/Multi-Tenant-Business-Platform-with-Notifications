import { useState, useEffect, useCallback } from 'react';
import { FiShield, FiSmartphone, FiCheckCircle, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import settingsService from '../../../services/settingsService';
import { toast } from '../../../components/ui/Toast';

/**
 * Two-factor login with an authenticator app (Google Authenticator, Microsoft
 * Authenticator, FreeOTP...). Set-up happens on Keycloak's secure screen: it shows
 * the QR code, checks the first code, and from then on asks for a code at sign-in.
 */
export default function MfaPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await settingsService.mfa.getStatus());
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load your two-factor status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setup = () => settingsService.mfa.startSetup(); // leaves the page, comes back when done

  const turnOff = async () => {
    setWorking(true);
    try {
      await settingsService.mfa.disable();
      toast.success('Two-factor login turned off');
      setConfirmOff(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not turn off two-factor login');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Two-Factor Login</h1>
          <p className="text-sm text-secondary-500 mt-0.5">Protect your account with a code from your phone at every sign-in.</p>
        </div>
        <button onClick={load} disabled={loading} title="Refresh"
          className="p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-500 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition disabled:opacity-50">
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <Card><div className="p-12 text-center text-secondary-400 text-sm">Loading…</div></Card>
      ) : error ? (
        <Card><EmptyState icon={FiShield} title="Couldn't load status" description={error}
          action={<button onClick={load} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm">Try again</button>} /></Card>
      ) : (
        <Card>
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${status.enabled ? 'bg-success-100 dark:bg-success-900/30 text-success-600' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500'}`}>
              <FiSmartphone size={24} />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-secondary-900 dark:text-white">Authenticator app</h2>
                {status.enabled
                  ? <Badge variant="success" dot>On</Badge>
                  : status.totpRequired ? <Badge variant="warning" dot>Set-up pending</Badge> : <Badge variant="gray">Off</Badge>}
              </div>

              {status.enabled ? (
                <p className="text-sm text-secondary-600 dark:text-secondary-300 flex items-start gap-2">
                  <FiCheckCircle className="text-success-600 mt-0.5 flex-shrink-0" size={15} />
                  Your account asks for a 6-digit code from your authenticator app at every sign-in.
                </p>
              ) : (
                <>
                  <p className="text-sm text-secondary-600 dark:text-secondary-300">
                    You'll be taken to the secure sign-in screen, which shows a QR code. Scan it with an authenticator app
                    (Google Authenticator, Microsoft Authenticator, FreeOTP…), then enter the 6-digit code it shows.
                  </p>
                  {status.totpRequired && (
                    <p className="text-xs text-warning-700 dark:text-warning-400 flex items-start gap-2">
                      <FiAlertTriangle className="mt-0.5 flex-shrink-0" size={13} />
                      Set-up was requested but not finished yet. You'll be asked to finish it at your next sign-in.
                    </p>
                  )}
                </>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {status.enabled ? (
                  <button onClick={() => setConfirmOff(true)}
                    className="px-4 py-2 rounded-lg border border-urgent-200 dark:border-urgent-800 text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-sm font-medium transition">
                    Turn off
                  </button>
                ) : (
                  <button onClick={setup}
                    className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium shadow-sm transition">
                    Set up authenticator app
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <ConfirmDialog open={confirmOff} onClose={() => setConfirmOff(false)} onConfirm={turnOff} loading={working} variant="danger"
        title="Turn off two-factor login?" message="Your account will only be protected by your password. You can turn it on again any time."
        confirmLabel="Turn off" />
    </div>
  );
}
