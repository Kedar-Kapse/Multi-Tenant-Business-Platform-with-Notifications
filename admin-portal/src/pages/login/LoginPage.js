import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiShield, FiUsers, FiFileText, FiHome } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import api, { ACCESS_SECURITY } from '../../services/api';

const STATS_BASE = `${ACCESS_SECURITY}/api/admin/v1/dashboard`;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  // ── Live stats from backend ──
  const [stats, setStats] = useState({ tenants: null, staff: null, patients: null });

  useEffect(() => {
    const fetchStats = async () => {
      const results = await Promise.allSettled([
        api.get(`${STATS_BASE}/tenant-count`),
        api.get(`${STATS_BASE}/staff-count`),
        api.get(`${STATS_BASE}/patient-count`),
      ]);
      setStats({
        tenants: results[0].status === 'fulfilled' ? results[0].value.data.count : null,
        staff: results[1].status === 'fulfilled' ? results[1].value.data.count : null,
        patients: results[2].status === 'fulfilled' ? results[2].value.data.count : null,
      });
    };
    fetchStats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (value) => {
    if (value === null) return '--';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const statItems = [
    { label: 'Active Tenants', value: stats.tenants, icon: FiHome },
    { label: 'Staff Members', value: stats.staff, icon: FiUsers },
    { label: 'Patient Records', value: stats.patients, icon: FiFileText },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#dce2ee] p-2 sm:p-4">
      {/* ── Main card container ── */}
      <div className="w-full max-w-[960px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[580px]">

        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div className="lg:w-[45%] flex flex-col">
          {/* Doctor image */}
          <div className="relative h-48 lg:h-auto lg:flex-1 overflow-hidden bg-blue-50">
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
              <span className="text-base font-bold tracking-tight">Invision</span>
            </div>

            {/* Text with left accent border */}
            <div className="border-l-[3px] border-white/40 pl-4">
              <h2 className="text-lg font-bold leading-snug">
                Welcome to <span className="text-xl">Invision</span>
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
                const isLoading = item.value === null;
                return (
                  <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-2 text-center">
                    <Icon size={11} className="mx-auto text-primary-200 mb-1" />
                    <p className={`text-sm font-bold leading-none ${isLoading ? 'animate-pulse' : ''}`}>
                      {isLoading ? (
                        <span className="inline-block w-8 h-4 bg-white/20 rounded" />
                      ) : (
                        formatCount(item.value)
                      )}
                    </p>
                    <p className="text-[9px] text-primary-200 mt-1 leading-none">{item.label}</p>
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
              <span className="text-xl font-bold text-primary-600 tracking-tight">Invision</span>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-secondary-900">Login</h1>
            <p className="text-sm text-secondary-500 mt-1 mb-7">Enter your credentials to login to your account</p>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-urgent-50 border border-urgent-200 text-urgent-700 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-secondary-800 mb-1.5">Email</label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-lg" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-4 pr-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm text-secondary-900 placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder="example.nazarbecks@gmail.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary-800 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-lg" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-lg border border-secondary-200 bg-white text-sm text-secondary-900 placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition"
                  >
                    {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button type="button" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition">
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary-600/25"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Sign up link */}
            <p className="text-center text-sm text-secondary-500 mt-6">
              Don't have an account?{' '}
              <button type="button" className="font-semibold text-primary-600 hover:text-primary-700 transition">
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
