import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { FiShield, FiUsers, FiCalendar, FiFileText, FiLogOut, FiAlertTriangle } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import { titleCase } from '../../utils/format';

const statItems = [
  { label: 'My Patients', icon: FiUsers },
  { label: 'Appointments', icon: FiCalendar },
  { label: 'Clinical Notes', icon: FiFileText },
];

function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-100 dark:bg-secondary-950 p-3 sm:p-4">
      <div className="w-full max-w-[960px] bg-white dark:bg-secondary-900 rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row lg:min-h-[560px]">
        <div className="lg:w-[45%] bg-gradient-to-br from-primary-600 to-primary-800 px-6 sm:px-8 py-7 text-white flex flex-col justify-end">
          <FiShield className="text-white/15 hidden lg:block mb-auto mt-8 mx-auto" size={120} />
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiShield size={14} /></div>
            <span className="text-base font-bold tracking-tight">KayCare</span>
          </div>
          <div className="border-l-[3px] border-white/40 pl-4">
            <h2 className="text-lg font-bold leading-snug">Provider Portal</h2>
            <p className="text-primary-100 text-xs leading-relaxed mt-2 max-w-[300px]">
              Secure clinical workspace for healthcare providers. Manage patients, schedules, and documentation.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5">
            {statItems.map(({ label, icon: Icon }) => (
              <div key={label} className="bg-white/10 rounded-lg px-2 py-2 text-center">
                <Icon size={12} className="mx-auto text-primary-100 mb-1" />
                <p className="text-[10px] text-primary-100 leading-none">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:w-[55%] flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const deniedUser = useAuthStore((s) => s.deniedUser);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const started = useRef(false);

  // Go straight to the secure sign-in page (once), unless there is something to show.
  useEffect(() => {
    if (user || deniedUser || error || started.current) return;
    started.current = true;
    login();
  }, [user, deniedUser, error, login]);

  if (user) return <Navigate to="/" replace />;

  if (deniedUser) {
    const roles = deniedUser.roles?.length ? deniedUser.roles.map(titleCase).join(', ') : 'none';
    return (
      <Shell>
        <div className="w-12 h-12 rounded-2xl bg-warning-50 dark:bg-warning-700/20 flex items-center justify-center mb-4">
          <FiAlertTriangle className="text-warning-600" size={22} />
        </div>
        <h1 className="text-xl font-bold text-secondary-900 dark:text-white">This is not a provider account</h1>
        <p className="text-sm text-secondary-500 mt-2">
          You are signed in as <span className="font-medium text-secondary-700 dark:text-secondary-200 break-all">{deniedUser.username || deniedUser.email}</span>.
          The Provider Portal is for physicians, nurses, therapists and other clinical staff.
        </p>
        <p className="text-xs text-secondary-400 mt-2">Your roles: {roles}</p>
        {deniedUser.roles?.includes('PATIENT') && (
          <p className="text-sm text-secondary-500 mt-3">Patients can use the Patient Portal to see appointments and messages.</p>
        )}
        <button type="button" onClick={logout}
          className="mt-6 w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          <FiLogOut size={15} /> Sign out and use another account
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Provider Login</h1>
      <p className="text-sm text-secondary-500 mt-1 mb-7">
        {error ? 'Sign-in could not be started.' : "You'll be redirected to our secure sign-in page to enter your credentials."}
      </p>
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-urgent-50 dark:bg-urgent-900/20 border border-urgent-200 dark:border-urgent-800 text-urgent-700 dark:text-urgent-300 text-sm">{error}</div>
      )}
      <button type="button" onClick={error ? () => window.location.reload() : login}
        className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition shadow-md shadow-primary-600/25">
        {error ? 'Try again' : 'Sign In'}
      </button>
    </Shell>
  );
}
