import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiSun, FiMoon, FiLogOut, FiUser, FiChevronDown, FiMenu, FiCheck, FiSettings, FiShield } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import useNotificationStore from '../../store/notificationStore';
import { formatRelativeTime } from '../../utils/formatters';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, toggleSidebar } = useThemeStore();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotificationStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut Ctrl/Cmd+K for search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  const recentNotifs = notifications.slice(0, 5);

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-xl border-b border-secondary-200 dark:border-secondary-800 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile menu + Search */}
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">
          <FiMenu size={18} />
        </button>
        <div className={`relative transition-all ${searchFocused ? 'w-80' : 'w-64'} hidden sm:block`}>
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
          <input
            id="global-search"
            type="text"
            placeholder="Search patients, claims, staff..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-9 pr-12 py-2 bg-secondary-50 dark:bg-secondary-800 border-0 rounded-xl text-xs text-secondary-700 dark:text-secondary-300 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-medium text-secondary-400 bg-secondary-100 dark:bg-secondary-700 rounded">⌘K</kbd>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition-colors" title="Toggle theme">
          {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
        </button>

        {/* Notifications dropdown */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition-colors">
            <FiBell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-urgent-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                    <FiCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <FiBell className="mx-auto text-secondary-300 mb-2" size={24} />
                    <p className="text-xs text-secondary-400">No notifications yet</p>
                  </div>
                ) : (
                  recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { markAsRead(n.id); setNotifOpen(false); }}
                      className={`px-4 py-3 border-b border-secondary-50 dark:border-secondary-700/50 cursor-pointer hover:bg-secondary-50/50 dark:hover:bg-secondary-700/30 transition ${!n.read ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-primary-500' : 'bg-secondary-300 dark:bg-secondary-600'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${!n.read ? 'font-medium text-secondary-900 dark:text-white' : 'text-secondary-600 dark:text-secondary-400'}`}>
                            {n.title || n.msg || n.message || 'New notification'}
                          </p>
                          <p className="text-[10px] text-secondary-400 mt-0.5">{formatRelativeTime(n.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-secondary-100 dark:border-secondary-700">
                <button onClick={() => { setNotifOpen(false); navigate('/notifications'); }} className="w-full text-center text-xs text-primary-600 hover:text-primary-700 font-medium py-1">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-secondary-200 dark:bg-secondary-700 mx-1 hidden sm:block" />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md shadow-primary-600/20">
              <FiUser className="text-white" size={14} />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-secondary-800 dark:text-secondary-200 leading-none">{user?.username || 'Admin'}</p>
              <p className="text-[10px] text-secondary-400 mt-0.5">{user?.roles?.[0] || 'Administrator'}</p>
            </div>
            <FiChevronDown size={12} className={`text-secondary-400 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 py-1 z-50">
              <div className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700">
                <p className="text-sm font-medium text-secondary-900 dark:text-white">{user?.username}</p>
                <p className="text-xs text-secondary-400 mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <FiShield size={10} className="text-success-500" />
                  <span className="text-[10px] text-success-600 font-medium">HIPAA Session Active</span>
                </div>
              </div>
              <div className="py-1">
                <button onClick={() => { setProfileOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors">
                  <FiSettings size={14} /> Settings
                </button>
                <button onClick={() => { setProfileOpen(false); navigate('/mfa'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors">
                  <FiShield size={14} /> MFA Security
                </button>
              </div>
              <div className="border-t border-secondary-100 dark:border-secondary-700 py-1">
                <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition-colors">
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
