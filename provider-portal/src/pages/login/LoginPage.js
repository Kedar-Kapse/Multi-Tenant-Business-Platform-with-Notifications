import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiShield, FiUsers, FiCalendar, FiFileText } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

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
              <span className="text-base font-bold tracking-tight">Invision</span>
            </div>

            <div className="border-l-[3px] border-white/40 pl-4">
              <h2 className="text-lg font-bold leading-snug">
                Welcome to <span className="text-xl">Invision</span>
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
              <span className="text-xl font-bold text-primary-600 tracking-tight">Invision</span>
            </div>

            <h1 className="text-2xl font-bold text-secondary-900">Provider Login</h1>
            <p className="text-sm text-secondary-500 mt-1 mb-7">Enter your credentials to access the provider portal</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-urgent-50 border border-urgent-200 text-urgent-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-secondary-800 mb-1.5">Username</label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-lg" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus
                    className="w-full pl-4 pr-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm text-secondary-900 placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder="Enter your username" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary-800 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-lg" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full pl-4 pr-10 py-3 rounded-lg border border-secondary-200 bg-white text-sm text-secondary-900 placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    placeholder="Enter your password" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition">
                    {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button type="button" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition">Forgot Password?</button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary-600/25">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
