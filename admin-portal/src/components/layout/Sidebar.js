import { NavLink, useLocation } from 'react-router-dom';
import useThemeStore from '../../store/themeStore';
import useNotificationStore from '../../store/notificationStore';
import { useEffect } from 'react';
import {
  FiGrid, FiUsers, FiUserPlus, FiFileText, FiPackage,
  FiDollarSign, FiCreditCard, FiShield, FiList, FiLock,
  FiSettings, FiChevronLeft, FiActivity, FiBell,
  FiKey, FiMonitor,
} from 'react-icons/fi';

const sections = [
  {
    title: 'ANALYTICS',
    items: [{ label: 'Dashboard', icon: FiGrid, path: '/' }],
  },
  {
    title: 'ORGANIZATION',
    items: [
      { label: 'Staff Management', icon: FiUsers, path: '/staff' },
      { label: 'EHR Rules', icon: FiFileText, path: '/ehr' },
      { label: 'Inventory & Facility', icon: FiPackage, path: '/inventory' },
      { label: 'Tenants', icon: FiUserPlus, path: '/tenants' },
    ],
  },
  {
    title: 'FINANCIALS',
    items: [
      { label: 'Claims', icon: FiDollarSign, path: '/claims' },
      { label: 'Fee Schedules', icon: FiCreditCard, path: '/fee-schedule' },
    ],
  },
  {
    title: 'SECURITY',
    items: [
      { label: 'Audit Logs', icon: FiList, path: '/audit-logs' },
      { label: 'Permissions', icon: FiLock, path: '/permissions' },
      { label: 'MFA Setup', icon: FiKey, path: '/mfa' },
      { label: 'Sessions', icon: FiMonitor, path: '/sessions' },
    ],
  },
];

const bottomItems = [
  { label: 'Notifications', icon: FiBell, path: '/notifications', badge: true },
  { label: 'Settings', icon: FiSettings, path: '/settings' },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
    isActive
      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
      : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 hover:text-secondary-900 dark:hover:text-white'
  }`;

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useThemeStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const location = useLocation();

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 1024 && sidebarOpen) {
      toggleSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <aside className={`fixed top-0 left-0 z-40 h-screen bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-800 flex flex-col transition-all duration-300
      ${sidebarOpen ? 'w-[260px] translate-x-0' : 'w-[72px] -translate-x-full lg:translate-x-0'}`}>
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-secondary-100 dark:border-secondary-800">
        {sidebarOpen && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-md shadow-primary-600/30">
              <FiActivity className="text-white" size={16} />
            </div>
            <div>
              <span className="text-sm font-bold text-secondary-900 dark:text-white tracking-tight">HealthAdmin</span>
              <span className="block text-[10px] text-secondary-400 -mt-0.5">Control Center</span>
            </div>
          </div>
        )}
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition-colors">
          <FiChevronLeft className={`transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} size={16} />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5 scrollbar-thin">
        {sections.map((section) => (
          <div key={section.title}>
            {sidebarOpen && (
              <p className="px-3 mb-1.5 text-[10px] font-bold text-secondary-400 dark:text-secondary-500 uppercase tracking-[0.1em]">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ label, icon: Icon, path }) => (
                <NavLink key={path} to={path} end={path === '/'} className={linkCls} title={label}>
                  <Icon size={16} className="flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-secondary-100 dark:border-secondary-800 space-y-0.5">
        {bottomItems.map(({ label, icon: Icon, path, badge }) => (
          <NavLink key={path} to={path} className={linkCls} title={label}>
            <div className="relative flex-shrink-0">
              <Icon size={16} />
              {badge && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-urgent-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </div>
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* HIPAA badge */}
      {sidebarOpen && (
        <div className="px-4 py-3 border-t border-secondary-100 dark:border-secondary-800">
          <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <FiShield className="text-primary-600 dark:text-primary-400 flex-shrink-0" size={14} />
            <div>
              <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase">HIPAA Compliant</p>
              <p className="text-[10px] text-primary-500 dark:text-primary-400">All sessions encrypted</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
