import { Navigate, useLocation } from 'react-router-dom';
import { FiLogOut, FiUserX } from 'react-icons/fi';
import useAuthStore from '../store/authStore';

/** Signed in AND holds the PATIENT realm role; anyone else gets a clear explanation. */
export default function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.isPatient) return <NotPatientScreen user={user} />;
  return children;
}

function NotPatientScreen({ user }) {
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-secondary-50 dark:bg-secondary-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-secondary-900 rounded-2xl shadow-xl border border-secondary-200 dark:border-secondary-800 p-6 sm:p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-warning-50 dark:bg-warning-700/20 flex items-center justify-center">
          <FiUserX className="text-warning-600" size={24} />
        </div>
        <h1 className="text-lg font-bold text-secondary-900 dark:text-white">This is the patient portal</h1>
        <p className="text-sm text-secondary-600 dark:text-secondary-300 mt-2">
          You are signed in as <span className="font-semibold break-all">{user.username || user.email}</span>, but this account is not a patient account.
        </p>
        <p className="text-xs text-secondary-500 mt-2">
          Staff and administrators should use their own portal. If you are a patient, sign out and sign in with your patient account.
        </p>
        <button type="button" onClick={logout} className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition">
          <FiLogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}
