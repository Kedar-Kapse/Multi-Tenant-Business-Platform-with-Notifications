import { useEffect } from 'react';
import { FiShield, FiUsers, FiCalendar, FiFileText } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';

export default function LoginPage() {
  const login = useAuthStore(s => s.login);
  const error = useAuthStore(s => s.error);

  // Go straight to the secure sign-in page — no extra click needed.
  useEffect(() => {
    login();
  }, [login]);

  const statItems = [
    { label: 'My Patients', icon: FiUsers },
    { label: 'Appointments', icon: FiCalendar },
    { label: 'Clinical Notes', icon: FiFileText },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#dce2ee] p-2 sm:p-4">
      <div className="w-full max-w-[960px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[580px]">

        {/* Left Panel */}
        <div className="lg:w-[45%] flex flex-col">
          <div className="relative h-48 lg:h-auto lg:flex-1 overflow-hidden bg-primary-50">
            <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              <FiShield className="text-white/20" size={120} />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-primary-700/30 to-transparent" />
          </div>

          <div className="bg-primary-600 px-8 py-7 text-white">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <FiShield size={14} />
              </div>
              <span className="text-base font-bold tracking-tight">KayCare</span>
            </div>

            <div className="border-l-[3px] border-white/40 pl-4">
              <h2 className="text-lg font-bold leading-snug">
                Welcome to <span className="text-xl">KayCare</span>
                <br />
                Provider Portal
              </h2>
              <p className="text-primary-100 text-xs leading-relaxed mt-2 max-w-[300px]">
                Secure clinical workspace for healthcare providers. Manage patients, schedules, and documentation.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5">
              {statItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-2 text-center">
                    <Icon size={11} className="mx-auto text-primary-200 mb-1" />
                    <p className="text-[9px] text-primary-200 mt-1 leading-none">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:w-[55%] flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white">
                <FiShield size={16} />
              </div>
              <span className="text-xl font-bold text-primary-600 tracking-tight">KayCare</span>
            </div>

            <h1 className="text-2xl font-bold text-secondary-900">Provider Login</h1>
            <p className="text-sm text-secondary-500 mt-1 mb-7">
              You'll be redirected to our secure sign-in page to enter your credentials.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-urgent-50 border border-urgent-200 text-urgent-700 text-sm">{error}</div>
            )}

            <button type="button" onClick={login}
              className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md shadow-primary-600/25">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
