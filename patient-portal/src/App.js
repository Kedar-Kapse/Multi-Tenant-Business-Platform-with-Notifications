import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ToastContainer from './components/ui/Toast';
import useAuthStore from './store/authStore';
import PrivateRoute from './components/PrivateRoute';
import PatientLayout from './components/layout/PatientLayout';
import Splash from './components/Splash';

const LoginPage = lazy(() => import('./pages/login/LoginPage'));
const RegisterPage = lazy(() => import('./pages/register/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/forgot-password/ForgotPasswordPage'));
const PortalEntryPage = lazy(() => import('./pages/portal-entry/PortalEntryPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const AppointmentsPage = lazy(() => import('./pages/appointments/AppointmentsPage'));
const ProvidersPage = lazy(() => import('./pages/providers/ProvidersPage'));
const RecordsPage = lazy(() => import('./pages/records/RecordsPage'));
const NotesPage = lazy(() => import('./pages/notes/NotesPage'));
const BillingPage = lazy(() => import('./pages/billing/BillingPage'));
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/not-found/NotFoundPage'));

export default function App() {
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => { init(); }, [init]);

  if (!initialized) return <Splash />;

  return (
    <BrowserRouter>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/portal-entry" element={<PortalEntryPage />} />
          <Route path="/" element={<PrivateRoute><PatientLayout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="billing" element={<BillingPage />} />
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
