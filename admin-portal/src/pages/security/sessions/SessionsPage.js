import { useState, useEffect, useCallback } from 'react';
import { FiMonitor, FiRefreshCw, FiTrash2, FiShield, FiGlobe, FiClock } from 'react-icons/fi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import settingsService from '../../../services/settingsService';
import { formatDateTime, formatRelativeTime } from '../../../utils/formatters';
import { toast } from '../../../components/ui/Toast';

/** The admin's own signed-in devices, straight from Keycloak. */
export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await settingsService.sessions.getActive());
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load your sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async () => {
    setWorking(true);
    try {
      await settingsService.sessions.revoke(revokeTarget.id);
      toast.success('That device has been signed out');
      setRevokeTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not sign that device out');
    } finally {
      setWorking(false);
    }
  };

  const revokeOthers = async () => {
    setWorking(true);
    try {
      const { revoked } = await settingsService.sessions.revokeOthers();
      toast.success(revoked ? `Signed out ${revoked} other device${revoked > 1 ? 's' : ''}` : 'No other devices were signed in');
      setRevokeAllOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not sign out other devices');
    } finally {
      setWorking(false);
    }
  };

  const others = sessions.filter((s) => !s.current).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Active Sessions</h1>
          <p className="text-sm text-secondary-500 mt-0.5">Devices where your account is signed in.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm transition disabled:opacity-50">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setRevokeAllOpen(true)} disabled={others === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-urgent-200 dark:border-urgent-800 text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed">
            <FiTrash2 size={14} /> Sign out other devices
          </button>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 flex items-start gap-3">
        <FiShield className="text-primary-600 flex-shrink-0 mt-0.5" size={16} />
        <p className="text-xs text-primary-700 dark:text-primary-300">If you see a device you don't recognise, sign it out and change your password (Settings → Security).</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-secondary-400 text-sm">Loading sessions…</div>
      ) : error ? (
        <Card><EmptyState icon={FiMonitor} title="Couldn't load sessions" description={error}
          action={<button onClick={load} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm">Try again</button>} /></Card>
      ) : sessions.length === 0 ? (
        <Card><EmptyState icon={FiMonitor} title="No active sessions" description="Nothing to show." /></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.current ? 'bg-success-100 dark:bg-success-900/30 text-success-600' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500'}`}>
                    <FiMonitor size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                        {(s.applications || []).join(', ') || 'Signed in'}
                      </h3>
                      {s.current && <Badge variant="success" dot>This device</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-secondary-500 dark:text-secondary-400">
                      <span className="flex items-center gap-1"><FiGlobe size={10} /> {s.ipAddress || 'Unknown IP'}</span>
                      <span className="flex items-center gap-1"><FiClock size={10} /> Active {formatRelativeTime(s.lastAccess)}</span>
                      <span>Signed in {formatDateTime(s.started)}</span>
                    </div>
                  </div>
                </div>
                {!s.current && (
                  <button onClick={() => setRevokeTarget(s)} className="self-start sm:self-auto px-3 py-2 rounded-lg border border-urgent-200 dark:border-urgent-800 text-urgent-600 text-xs font-medium hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition flex-shrink-0">
                    Sign out
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!revokeTarget} onClose={() => setRevokeTarget(null)} onConfirm={revoke} loading={working}
        title="Sign out device" message={`Sign out the session from ${revokeTarget?.ipAddress || 'this device'}? It will need to log in again.`} confirmLabel="Sign out" />
      <ConfirmDialog open={revokeAllOpen} onClose={() => setRevokeAllOpen(false)} onConfirm={revokeOthers} loading={working}
        title="Sign out other devices" message="Every other device will be signed out. This device stays signed in." confirmLabel="Sign out others" />
    </div>
  );
}
