import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ToastContainer from './components/ui/Toast';
import { PageLoader } from './components/ui/States';
import useAuthStore from './store/authStore';
import PrivateRoute from './components/PrivateRoute';
import ProviderLayout from './components/layout/ProviderLayout';
import LoginPage from './pages/login/LoginPage';
import PortalEntryPage from './pages/portal-entry/PortalEntryPage';

// Each page is its own bundle, loaded when first visited.
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const SchedulePage = lazy(() => import('./pages/schedule/SchedulePage'));
const PatientsPage = lazy(() => import('./pages/patients/PatientsPage'));
const NotesPage = lazy(() => import('./pages/notes/NotesPage'));
const ClaimsPage = lazy(() => import('./pages/claims/ClaimsPage'));
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    init();
  }, [init]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-950">
        <PageLoader />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal-entry" element={<PortalEntryPage />} />
          <Route path="/" element={<PrivateRoute><ProviderLayout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="claims" element={<ClaimsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      <ToastContainer />
    </BrowserRouter>
  );
}
