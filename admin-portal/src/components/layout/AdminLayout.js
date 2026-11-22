import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import useNotificationStore from '../../store/notificationStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useThemeStore from '../../store/themeStore';

export default function AdminLayout() {
  const { sidebarOpen, toggleSidebar } = useThemeStore();
  const refreshNotifications = useNotificationStore((s) => s.refresh);

  // Bell badge: load now and every minute while the app is open.
  useEffect(() => {
    refreshNotifications();
    const id = setInterval(refreshNotifications, 60000);
    return () => clearInterval(id);
  }, [refreshNotifications]);

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden" onClick={toggleSidebar} />
      )}
      <Sidebar />
      <div className={`transition-all duration-300 min-h-screen ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[72px]'}`}>
        <Navbar />
        <main className="p-3 sm:p-4 md:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
