import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { FiGrid, FiCalendar, FiUsers, FiFileText, FiFolder, FiBell, FiUser, FiChevronLeft, FiActivity, FiDollarSign, FiMessageSquare, FiX } from 'react-icons/fi';
import useBadgeStore from '../../store/badgeStore';

const navItems = [
  { label: 'Dashboard', icon: FiGrid, path: '/' },
  { label: 'Appointments', icon: FiCalendar, path: '/appointments' },
  { label: 'Find Providers', icon: FiUsers, path: '/providers' },
  { label: 'Medical Records', icon: FiFolder, path: '/records' },
  { label: 'Visit Notes', icon: FiFileText, path: '/notes' },
  { label: 'Billing', icon: FiDollarSign, path: '/billing' },
  { label: 'Messages', icon: FiMessageSquare, path: '/messages', badge: 'messages' },
  { label: 'Notifications', icon: FiBell, path: '/notifications', badge: 'notifications' },
  { label: 'My Profile', icon: FiUser, path: '/profile' },
];

const linkCls = ({ isActive }) =>
  `relative flex items-center gap-3 px-3 py-2.5 lg:py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${isActive ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25' : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 hover:text-secondary-900 dark:hover:text-white'}`;

export default function Sidebar({ open, toggle, close }) {
  const location = useLocation();
  const messages = useBadgeStore((s) => s.messages);
  const notifications = useBadgeStore((s) => s.notifications);
  const counts = { messages, notifications };

  // On phones/tablets the menu is an overlay: close it after navigating.
  useEffect(() => {
    if (window.innerWidth < 1024) close();
  }, [location.pathname, close]);

  return (
    <aside className={`fixed top-0 left-0 z-40 h-screen h-[100dvh] bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-800 flex flex-col transition-all duration-300 ${open ? 'w-[260px] translate-x-0' : 'w-[72px] -translate-x-full lg:translate-x-0'}`}>
      <div className="flex items-center justify-between h-14 px-4 border-b border-secondary-100 dark:border-secondary-800">
        {open && (<div className="flex items-center gap-2.5 min-w-0"><div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-md shadow-primary-600/30 flex-shrink-0"><FiActivity className="text-white" size={16} /></div><div className="min-w-0"><span className="text-sm font-bold text-secondary-900 dark:text-white tracking-tight">KayCare</span><span className="block text-[10px] text-secondary-400 -mt-0.5">Patient Portal</span></div></div>)}
        <button type="button" onClick={toggle} aria-label={open ? 'Collapse menu' : 'Expand menu'} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">
          <FiX className="lg:hidden" size={18} />
          <FiChevronLeft className={`hidden lg:block transition-transform duration-300 ${!open ? 'rotate-180' : ''}`} size={16} />
        </button>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5 scrollbar-thin">
        {navItems.map(({ label, icon: Icon, path, badge }) => {
          const n = badge ? counts[badge] : 0;
          return (
            <NavLink key={path} to={path} end={path === '/'} className={linkCls} title={label}>
              <Icon size={16} className="flex-shrink-0" />
              {open && <span className="truncate flex-1">{label}</span>}
              {n > 0 && (open
                ? <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-urgent-500 text-white text-[10px] font-bold flex items-center justify-center">{n > 99 ? '99+' : n}</span>
                : <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-urgent-500" />)}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
