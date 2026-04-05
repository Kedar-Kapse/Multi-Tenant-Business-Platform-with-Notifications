import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { FiGrid, FiCalendar, FiUsers, FiFileText, FiFolder, FiBell, FiUser, FiChevronLeft, FiActivity, FiDollarSign, FiMessageSquare, FiShield } from 'react-icons/fi';

const navItems = [
  { label: 'Dashboard', icon: FiGrid, path: '/' },
  { label: 'Appointments', icon: FiCalendar, path: '/appointments' },
  { label: 'Find Providers', icon: FiUsers, path: '/providers' },
  { label: 'Medical Records', icon: FiFolder, path: '/records' },
  { label: 'Visit Notes', icon: FiFileText, path: '/notes' },
  { label: 'Billing', icon: FiDollarSign, path: '/billing' },
  { label: 'Messages', icon: FiMessageSquare, path: '/messages' },
  { label: 'Notifications', icon: FiBell, path: '/notifications' },
  { label: 'My Profile', icon: FiUser, path: '/profile' },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${isActive ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25' : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 hover:text-secondary-900 dark:hover:text-white'}`;

export default function Sidebar({ open, toggle }) {
  const location = useLocation();
  useEffect(() => { if (window.innerWidth < 1024 && open) toggle(); }, [location.pathname]); // eslint-disable-line

  return (
    <aside className={`fixed top-0 left-0 z-40 h-screen bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-800 flex flex-col transition-all duration-300 ${open ? 'w-[260px] translate-x-0' : 'w-[72px] -translate-x-full lg:translate-x-0'}`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-secondary-100 dark:border-secondary-800">
        {open && (<div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-md shadow-primary-600/30"><FiActivity className="text-white" size={16} /></div><div><span className="text-sm font-bold text-secondary-900 dark:text-white tracking-tight">Invision</span><span className="block text-[10px] text-secondary-400 -mt-0.5">Patient Portal</span></div></div>)}
        <button onClick={toggle} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition"><FiChevronLeft className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`} size={16} /></button>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5 scrollbar-thin">
        {navItems.map(({ label, icon: Icon, path }) => (<NavLink key={path} to={path} end={path === '/'} className={linkCls} title={label}><Icon size={16} className="flex-shrink-0" />{open && <span className="truncate">{label}</span>}</NavLink>))}
      </nav>
      {open && (<div className="px-4 py-3 border-t border-secondary-100 dark:border-secondary-800"><div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl"><FiShield className="text-primary-600 flex-shrink-0" size={14} /><div><p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase">HIPAA Compliant</p><p className="text-[10px] text-primary-500">All sessions encrypted</p></div></div></div>)}
    </aside>
  );
}
