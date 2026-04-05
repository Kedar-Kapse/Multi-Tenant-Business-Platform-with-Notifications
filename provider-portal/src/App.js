import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import ProviderLayout from './components/layout/ProviderLayout';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SchedulePage from './pages/schedule/SchedulePage';
import PatientsPage from './pages/patients/PatientsPage';
import NotesPage from './pages/notes/NotesPage';
import ClaimsPage from './pages/claims/ClaimsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProfilePage from './pages/profile/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><ProviderLayout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="claims" element={<ClaimsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
