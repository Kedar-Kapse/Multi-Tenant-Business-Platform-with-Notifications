import { Navigate } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import useAuthStore from '../store/authStore';

/**
 * Admin portal pages: signed in AND a hospital ADMIN (or a platform admin).
 * Other accounts (doctors, patients...) share the same sign-in, so without this
 * check they would land on admin screens whose data the API then refuses.
 */
export default function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return <Navigate to="/login" replace />;
  if (user.isPlatformAdmin || user.roles?.includes('ADMIN')) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-secondary-900 rounded-2xl shadow-xl border border-secondary-200 dark:border-secondary-800 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-600 flex items-center justify-center mx-auto mb-4">
          <FiShield size={22} />
        </div>
        <h1 className="text-lg font-bold text-secondary-900 dark:text-white">This is the admin portal</h1>
        <p className="text-sm text-secondary-500 mt-2">
          You're signed in as <strong className="text-secondary-700 dark:text-secondary-300">{user.username}</strong>, which is not an administrator account.
          Please use your own portal, or sign in with an admin account.
        </p>
        <button onClick={logout} className="mt-6 px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">
          Sign out
        </button>
      </div>
    </div>
  );
}
