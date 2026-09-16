import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useAuthStore from './store/authStore';
import PrivateRoute from './components/PrivateRoute';
import PatientLayout from './components/layout/PatientLayout';
import LoginPage from './pages/login/LoginPage';
import RegisterPage from './pages/register/RegisterPage';
import ForgotPasswordPage from './pages/forgot-password/ForgotPasswordPage';
import PortalEntryPage from './pages/portal-entry/PortalEntryPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import ProvidersPage from './pages/providers/ProvidersPage';
import RecordsPage from './pages/records/RecordsPage';
import NotesPage from './pages/notes/NotesPage';
import BillingPage from './pages/billing/BillingPage';
import MessagesPage from './pages/messages/MessagesPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProfilePage from './pages/profile/ProfilePage';

export default function App() {
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    init();
  }, [init]);

  if (!initialized) return null;

  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
