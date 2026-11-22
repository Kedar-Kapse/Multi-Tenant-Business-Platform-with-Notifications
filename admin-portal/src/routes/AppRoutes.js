import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';
import useAuthStore from '../store/authStore';
import AdminLayout from '../components/layout/AdminLayout';
const LoginPage = lazy(() => import('../pages/login/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const StaffPage = lazy(() => import('../pages/organization/staff/StaffPage'));
const PatientsPage = lazy(() => import('../pages/organization/patients/PatientsPage'));
const TenantsPage = lazy(() => import('../pages/organization/tenants/TenantsPage'));
const InventoryPage = lazy(() => import('../pages/organization/inventory/InventoryPage'));
const EhrPage = lazy(() => import('../pages/organization/ehr/EhrPage'));
const ClaimsPage = lazy(() => import('../pages/financials/claims/ClaimsPage'));
const FeeSchedulePage = lazy(() => import('../pages/financials/fee-schedule/FeeSchedulePage'));
const AuditLogsPage = lazy(() => import('../pages/security/audit-logs/AuditLogsPage'));
const PermissionsPage = lazy(() => import('../pages/security/permissions/PermissionsPage'));
const MfaPage = lazy(() => import('../pages/security/mfa/MfaPage'));
const SessionsPage = lazy(() => import('../pages/security/sessions/SessionsPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const MessagesPage = lazy(() => import('../pages/messages/MessagesPage'));

export default function AppRoutes() {
  const isPlatformAdmin = useAuthStore((s) => s.user?.isPlatformAdmin);

  // Platform admins only manage hospitals: every page leads to Tenants.
  if (isPlatformAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/tenants" replace />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="*" element={<Navigate to="/tenants" replace />} />
        </Route>
      </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="patients" element={<PatientsPage />} />
        {/* No "tenants" here: hospital admins cannot manage other hospitals. */}
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
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

/** Shown while a page's code is downloading (pages load on demand). */
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
