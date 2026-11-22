import { Suspense, useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Splash from '../Splash';

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

export default function PatientLayout() {
  // Closed by default on phones/tablets so the menu doesn't cover the page on load.
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const toggle = useCallback(() => setSidebarOpen((p) => !p), []);
  const close = useCallback(() => setSidebarOpen(false), []);
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden" onClick={close} aria-hidden="true" />}
      <Sidebar open={sidebarOpen} toggle={toggle} close={close} />
      <div className={`transition-all duration-300 min-h-screen min-w-0 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[72px]'}`}>
        <Navbar toggleSidebar={toggle} />
        <main className="p-3 sm:p-4 md:p-6 max-w-[1600px] mx-auto min-w-0">
          <Suspense fallback={<Splash fullScreen={false} label="Loading…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
