import { Navigate } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';

/**
 * Landing page when switching here from another portal. The one-time code in the
 * URL is exchanged during start-up (authStore.init), which hands the tokens to
 * keycloak-js; this page only shows the outcome.
 */
export default function PortalEntryPage() {
  const user = useAuthStore((s) => s.user);
  const deniedUser = useAuthStore((s) => s.deniedUser);
  const switchError = useAuthStore((s) => s.switchError);
  const error = useAuthStore((s) => s.error);

  if (user) return <Navigate to="/" replace />;
  if (deniedUser) return <Navigate to="/login" replace />;

  const message = switchError || error;
  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-secondary-900 rounded-2xl shadow-lg p-6 sm:p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-urgent-100 dark:bg-urgent-900/30 flex items-center justify-center">
            <FiX className="text-urgent-600" size={22} />
          </div>
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">Portal switch failed</h2>
          <p className="text-sm text-secondary-500 mb-6">{message}</p>
          <a href="/login" className="inline-block px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return <Navigate to="/login" replace />;
}
