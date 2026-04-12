import { useState, useEffect, useRef, useCallback } from 'react';
import { FiGrid, FiExternalLink, FiChevronDown, FiLoader, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import portalService from '../services/portalService';

const CURRENT_PORTAL = 'provider';

export default function PortalSwitcher({ userRoles }) {
  const [portals, setPortals] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(null);
  const [error, setError] = useState(null);
  const ref = useRef(null);
  const fetched = useRef(false);

  const isAdmin = userRoles?.some(
    (r) => r === 'ADMIN' || r === 'ROLE_ADMIN' || r === 'admin'
  );

  const fetchPortals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await portalService.getPortals();
      setPortals(list);
      fetched.current = true;
    } catch (err) {
      console.error('Failed to load portals:', err.response?.status, err.response?.data?.message || err.message);
      setError('Unable to load portals. Click to retry.');
      setPortals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = useCallback(() => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !fetched.current) {
      fetchPortals();
    }
  }, [open, fetchPortals]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isAdmin) return null;

  const handleSwitch = async (portalKey) => {
    if (portalKey === CURRENT_PORTAL) {
      setOpen(false);
      return;
    }
    setSwitching(portalKey);
    setError(null);
    try {
      const { redirect_url } = await portalService.switchToPortal(portalKey);
      window.open(redirect_url, '_blank');
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch portal');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800"
        title="Switch Portal"
      >
        <FiGrid size={14} />
        <span className="hidden sm:inline">Switch Portal</span>
        <FiChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-secondary-100 dark:border-secondary-700">
            <p className="text-xs font-semibold text-secondary-900 dark:text-white">Switch Portal</p>
            <p className="text-[10px] text-secondary-400 mt-0.5">Navigate to another portal without re-login</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 px-4 py-6">
              <FiLoader size={14} className="animate-spin text-indigo-500" />
              <span className="text-xs text-secondary-500">Loading portals...</span>
            </div>
          )}

          {!loading && error && portals.length === 0 && (
            <div className="px-4 py-4 text-center">
              <FiAlertCircle size={20} className="mx-auto text-urgent-400 mb-2" />
              <p className="text-[11px] text-secondary-500 mb-3">{error}</p>
              <button onClick={fetchPortals} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                <FiRefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {!loading && portals.length > 0 && (
            <div className="py-1">
              {portals.map((portal) => {
                const isCurrent = portal.key === CURRENT_PORTAL;
                const isLoading = switching === portal.key;
                return (
                  <button key={portal.key} onClick={() => handleSwitch(portal.key)} disabled={isLoading}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${isCurrent ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 cursor-default' : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-indigo-500' : 'bg-secondary-300 dark:bg-secondary-600'}`} />
                      <span className="font-medium text-xs">{portal.name}</span>
                    </div>
                    {isCurrent ? <span className="text-[10px] text-indigo-500 font-medium">Current</span>
                      : isLoading ? <FiLoader size={12} className="animate-spin text-secondary-400" />
                      : <FiExternalLink size={12} className="text-secondary-400" />}
                  </button>
                );
              })}
            </div>
          )}

          {error && portals.length > 0 && (
            <div className="px-4 py-2 border-t border-secondary-100 dark:border-secondary-700">
              <p className="text-[10px] text-urgent-500">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
