import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiUser, FiLogOut, FiSettings, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import useBadgeStore from '../../store/badgeStore';
import PortalSwitcher from '../PortalSwitcher';
import { titleCase } from '../../utils/format';

const THEME_KEY = 'provider_theme';

export default function Navbar({ toggleSidebar }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unread = useBadgeStore((s) => s.notifications);
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const ref = useRef(null);

  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage unavailable */ }
    if (saved) {
      document.documentElement.classList.toggle('dark', saved === 'dark');
      setDark(saved === 'dark');
    }
  }, []);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setProfileOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch { /* storage unavailable */ }
    setDark(next);
  };

  const role = titleCase(user?.primaryRole) || 'Provider';

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-xl border-b border-secondary-200 dark:border-secondary-800 flex items-center justify-between gap-2 px-3 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={toggleSidebar} aria-label="Open menu" className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition"><FiMenu size={18} /></button>
        <div className="min-w-0 hidden sm:block">
          <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">Welcome back, {user?.firstName || user?.username || 'Provider'}</p>
          <p className="text-[11px] text-secondary-400">{role}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <PortalSwitcher userRoles={user?.roles} />
        <button onClick={toggleTheme} aria-label={dark ? 'Light mode' : 'Dark mode'} className="p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">{dark ? <FiSun size={16} /> : <FiMoon size={16} />}</button>
        <button onClick={() => navigate('/notifications')} aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} className="relative p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">
          <FiBell size={16} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-urgent-500 text-white text-[9px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>
          )}
        </button>

        <div className="w-px h-6 bg-secondary-200 dark:bg-secondary-700 mx-1 hidden sm:block" />

        <div className="relative" ref={ref}>
          <button onClick={() => setProfileOpen(!profileOpen)} aria-haspopup="menu" aria-expanded={profileOpen} className="flex items-center gap-2.5 p-1.5 md:pr-3 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-600/20">
              <FiUser className="text-white" size={14} />
            </div>
            <div className="hidden md:block text-left max-w-[160px]">
              <p className="text-xs font-semibold text-secondary-800 dark:text-secondary-200 leading-none truncate">{user?.fullName || user?.username || 'Provider'}</p>
              <p className="text-[10px] text-secondary-400 mt-0.5">{role}</p>
            </div>
            <FiChevronDown size={12} className={`text-secondary-400 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 py-1 z-50">
              <div className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700">
                <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{user?.fullName || user?.username}</p>
                <p className="text-xs text-secondary-400 mt-0.5 truncate" title={user?.email}>{user?.email}</p>
              </div>
              <div className="py-1">
                <button role="menuitem" onClick={() => { setProfileOpen(false); navigate('/profile'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition">
                  <FiSettings size={14} /> My profile &amp; security
                </button>
              </div>
              <div className="border-t border-secondary-100 dark:border-secondary-700 py-1">
                <button role="menuitem" onClick={() => { setProfileOpen(false); logout(); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition">
                  <FiLogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
