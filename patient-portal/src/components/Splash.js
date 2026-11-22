import { FiActivity } from 'react-icons/fi';

/** Shown while Keycloak initialises and while a page's code is loading. */
export default function Splash({ fullScreen = true, label = 'Loading your portal…' }) {
  return (
    <div className={`${fullScreen ? 'min-h-screen min-h-[100dvh] bg-secondary-50 dark:bg-secondary-950' : 'py-24'} flex flex-col items-center justify-center`} role="status">
      <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30 animate-pulse">
        <FiActivity className="text-white" size={22} />
      </div>
      <p className="text-sm text-secondary-500 mt-4">{label}</p>
    </div>
  );
}
