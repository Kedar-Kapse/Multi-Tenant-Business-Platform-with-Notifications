import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useAuthStore from './store/authStore';
import PrivateRoute from './components/PrivateRoute';
import ProviderLayout from './components/layout/ProviderLayout';
import LoginPage from './pages/login/LoginPage';
import PortalEntryPage from './pages/portal-entry/PortalEntryPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SchedulePage from './pages/schedule/SchedulePage';
import PatientsPage from './pages/patients/PatientsPage';
import NotesPage from './pages/notes/NotesPage';
import ClaimsPage from './pages/claims/ClaimsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProfilePage from './pages/profile/ProfilePage';
import MessagesPage from './pages/messages/MessagesPage';

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
