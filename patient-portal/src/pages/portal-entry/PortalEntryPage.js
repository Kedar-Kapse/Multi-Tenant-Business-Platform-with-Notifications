import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import Splash from '../../components/Splash';

/**
 * Landing page for "Switch portal". The one-time code is exchanged by
 * authStore.init() BEFORE keycloak-js starts, and the tokens are handed straight
 * to keycloak.init({ token, refreshToken }) -- nothing is kept in localStorage.
 * This page only routes the user on, or explains what went wrong.
 */
export default function PortalEntryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.portalEntryError);
  const done = useRef(false); // StrictMode runs effects twice in development

  useEffect(() => {
    if (done.current || !user) return;
    done.current = true;
    navigate('/', { replace: true });
  }, [user, navigate]);

  if (user) return <Splash label="Opening your portal…" />;

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-secondary-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-secondary-200 p-6 sm:p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-urgent-100 flex items-center justify-center">
          <FiX className="text-urgent-600" size={22} />
        </div>
        <h2 className="text-lg font-semibold text-secondary-900 mb-2">Portal switch failed</h2>
        <p className="text-sm text-secondary-600 mb-6 break-words">{error || 'We could not sign you in from the other portal.'}</p>
        <Link to="/login" replace className="inline-block px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
