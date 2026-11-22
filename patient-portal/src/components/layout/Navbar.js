import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiUser, FiLogOut, FiSettings, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import useBadgeStore, { refreshAllBadges } from '../../store/badgeStore';
import PortalSwitcher from '../PortalSwitcher';
import { humanize } from '../../utils/format';

const POLL_MS = 60000;
const THEME_KEY = 'patient_portal_theme';

const readTheme = () => {
  try { return localStorage.getItem(THEME_KEY) === 'dark'; } catch { return false; }
};

export default function Navbar({ toggleSidebar }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unread = useBadgeStore((s) => s.notifications);
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark') || readTheme());
  const ref = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch { /* private mode */ }
  }, [dark]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, []);

  // Unread badges: on load, every 60s while the tab is visible, and when the tab comes back.
  useEffect(() => {
    refreshAllBadges();
    const id = setInterval(() => { if (document.visibilityState === 'visible') refreshAllBadges(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshAllBadges(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const roleLabel = user?.isPatient ? 'Patient' : humanize(user?.roles?.[0]) || 'Signed in';
  const displayName = user?.fullName || user?.username || '';

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-xl border-b border-secondary-200 dark:border-secondary-800 flex items-center justify-between gap-2 px-3 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button type="button" onClick={toggleSidebar} aria-label="Open menu" className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-500 transition"><FiMenu size={20} /></button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
            <span className="sm:hidden">KayCare</span>
            <span className="hidden sm:inline">Welcome{user?.firstName ? `, ${user.firstName}` : ''}</span>
          </p>
          <p className="text-[11px] text-secondary-400 hidden sm:block">Patient Portal</p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        <PortalSwitcher userRoles={user?.roles} />
        <button type="button" onClick={() => setDark((d) => !d)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">{dark ? <FiSun size={16} /> : <FiMoon size={16} />}</button>
        <button type="button" onClick={() => navigate('/notifications')} aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} className="relative p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">
          <FiBell size={16} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-urgent-500 text-white text-[9px] font-bold leading-4 text-center ring-2 ring-white dark:ring-secondary-900">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
        <div className="w-px h-6 bg-secondary-200 dark:bg-secondary-700 mx-1 hidden sm:block" />
        <div className="relative" ref={ref}>
          <button type="button" onClick={() => setProfileOpen((o) => !o)} aria-haspopup="menu" aria-expanded={profileOpen} className="flex items-center gap-2.5 p-1 sm:p-1.5 md:pr-3 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-600/20"><FiUser className="text-white" size={14} /></div>
            <div className="hidden md:block text-left max-w-[160px]"><p className="text-xs font-semibold text-secondary-800 dark:text-secondary-200 leading-none truncate">{displayName}</p><p className="text-[10px] text-secondary-400 mt-0.5">{roleLabel}</p></div>
            <FiChevronDown size={12} className={`text-secondary-400 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 py-1 z-50">
              <div className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-secondary-400 mt-0.5 truncate">{user?.email}</p>
                <p className="text-[10px] text-secondary-400 mt-1 uppercase tracking-wide">{roleLabel}</p>
              </div>
              <div className="py-1"><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('/profile'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition"><FiSettings size={14} /> Profile &amp; security</button></div>
              <div className="border-t border-secondary-100 dark:border-secondary-700 py-1"><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); logout(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition"><FiLogOut size={14} /> Sign out</button></div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
