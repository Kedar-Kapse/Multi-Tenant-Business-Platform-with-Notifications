import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { PageLoader } from '../ui/States';
import useBadgeStore from '../../store/badgeStore';

const POLL_MS = 60000;

export default function ProviderLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const toggle = () => setSidebarOpen((p) => !p);
  const refreshBadges = useBadgeStore((s) => s.refresh);
  const location = useLocation();

  // Unread counters for the bell and sidebar: on load, every minute, and when the tab regains focus.
  useEffect(() => {
    refreshBadges();
    const timer = setInterval(() => { if (!document.hidden) refreshBadges(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) refreshBadges(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshBadges]);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 overflow-x-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden" onClick={toggle} />}
      <Sidebar open={sidebarOpen} toggle={toggle} />
      <div className={`transition-all duration-300 min-h-screen min-w-0 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[72px]'}`}>
        <Navbar toggleSidebar={toggle} />
        <main className="p-3 sm:p-4 md:p-6 max-w-[1600px] mx-auto min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
