import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiUsers, FiFileText, FiHome } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Already signed in -> go to the app; otherwise straight to the secure sign-in page.
  useEffect(() => {
    if (user) navigate('/', { replace: true });
    else login();
  }, [user, login, navigate]);

  const statItems = [
    { label: 'Multi-hospital', icon: FiHome },
    { label: 'Staff & roles', icon: FiUsers },
    { label: 'Clinical records', icon: FiFileText },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-200 p-2 sm:p-4">
      {/* ── Main card container ── */}
      <div className="w-full max-w-[960px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[580px]">

        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div className="lg:w-[45%] flex flex-col">
          {/* Doctor image */}
          <div className="relative h-48 lg:h-auto lg:flex-1 overflow-hidden bg-primary-50">
            <img
              src="/doctor-hero.jpg"
              alt="Healthcare professional"
              className="w-full h-full object-cover"
            />
            {/* Subtle gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-primary-700/30 to-transparent" />
          </div>

          {/* Branding section */}
          <div className="bg-primary-600 px-8 py-7 text-white">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <FiShield size={14} />
              </div>
              <span className="text-base font-bold tracking-tight">KayCare</span>
            </div>

            {/* Text with left accent border */}
            <div className="border-l-[3px] border-white/40 pl-4">
              <h2 className="text-lg font-bold leading-snug">
                Welcome to <span className="text-xl">KayCare</span>
                <br />
                Hospital Management System
              </h2>
              <p className="text-primary-100 text-xs leading-relaxed mt-2 max-w-[300px]">
                Cloud Based Streamline Hospital Management system with centralized user friendly platform
              </p>
            </div>

            {/* ── Live stats row ── */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              {statItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-2 text-center">
                    <Icon size={13} className="mx-auto text-primary-100 mb-1" />
                    <p className="text-[10px] text-primary-100 leading-tight">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL ═══════════ */}
        <div className="lg:w-[55%] flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white">
                <FiShield size={16} />
              </div>
              <span className="text-xl font-bold text-primary-600 tracking-tight">KayCare</span>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-secondary-900">Login</h1>
            <p className="text-sm text-secondary-500 mt-1 mb-7">
              You'll be redirected to our secure sign-in page to enter your credentials.
            </p>

            <button
              type="button"
              onClick={login}
              className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md shadow-primary-600/25"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
