import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';
import AdminLayout from '../components/layout/AdminLayout';
import LoginPage from '../pages/login/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import StaffPage from '../pages/organization/staff/StaffPage';
import TenantsPage from '../pages/organization/tenants/TenantsPage';
import InventoryPage from '../pages/organization/inventory/InventoryPage';
import EhrPage from '../pages/organization/ehr/EhrPage';
import ClaimsPage from '../pages/financials/claims/ClaimsPage';
import FeeSchedulePage from '../pages/financials/fee-schedule/FeeSchedulePage';
import AuditLogsPage from '../pages/security/audit-logs/AuditLogsPage';
import PermissionsPage from '../pages/security/permissions/PermissionsPage';
import MfaPage from '../pages/security/mfa/MfaPage';
import SessionsPage from '../pages/security/sessions/SessionsPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import SettingsPage from '../pages/settings/SettingsPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        {/* Organization */}
        <Route path="staff" element={<StaffPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="ehr" element={<EhrPage />} />
        {/* Financials */}
        <Route path="claims" element={<ClaimsPage />} />
        <Route path="fee-schedule" element={<FeeSchedulePage />} />
        {/* Security */}
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="mfa" element={<MfaPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        {/* System */}
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
