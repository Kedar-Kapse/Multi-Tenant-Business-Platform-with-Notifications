import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiUser, FiLogOut, FiSettings, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';

export default function Navbar({ toggleSidebar }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const ref = useRef(null);

  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setProfileOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const handleLogout = async () => { setProfileOpen(false); await logout(); navigate('/login'); };

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-xl border-b border-secondary-200 dark:border-secondary-800 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition"><FiMenu size={18} /></button>
        <div className="hidden sm:block"><p className="text-sm font-semibold text-secondary-900 dark:text-white">Welcome, {user?.firstName || user?.username || 'Patient'}</p><p className="text-[11px] text-secondary-400">Patient Portal</p></div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => { document.documentElement.classList.toggle('dark'); setDark(!dark); }} className="p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">{dark ? <FiSun size={16} /> : <FiMoon size={16} />}</button>
        <button onClick={() => navigate('/notifications')} className="p-2 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition"><FiBell size={16} /></button>
        <div className="w-px h-6 bg-secondary-200 dark:bg-secondary-700 mx-1 hidden sm:block" />
        <div className="relative" ref={ref}>
          <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-600/20"><FiUser className="text-white" size={14} /></div>
            <div className="hidden md:block text-left"><p className="text-xs font-semibold text-secondary-800 dark:text-secondary-200 leading-none">{user?.fullName || user?.username || 'Patient'}</p><p className="text-[10px] text-secondary-400 mt-0.5">Patient</p></div>
            <FiChevronDown size={12} className={`text-secondary-400 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 py-1 z-50">
              <div className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700"><p className="text-sm font-medium text-secondary-900 dark:text-white">{user?.fullName}</p><p className="text-xs text-secondary-400 mt-0.5">{user?.email}</p></div>
              <div className="py-1"><button onClick={() => { setProfileOpen(false); navigate('/profile'); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition"><FiSettings size={14} /> Settings</button></div>
              <div className="border-t border-secondary-100 dark:border-secondary-700 py-1"><button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition"><FiLogOut size={14} /> Sign out</button></div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
