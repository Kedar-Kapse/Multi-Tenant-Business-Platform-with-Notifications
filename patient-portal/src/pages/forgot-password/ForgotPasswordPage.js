import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShield, FiMail, FiArrowRight, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import { registrationApi } from '../../services/registrationService';

const PURPOSE = 'FORGOT_PASSWORD';
const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const channel = 'EMAIL';
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const reset = () => { setError(''); setInfo(''); };

  const requestOtp = async () => {
    reset();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Valid email required.'); return; }
    setLoading(true);
    try {
      await registrationApi.requestOtp(email, channel, PURPOSE);
      setInfo('We emailed you a verification code.');
      setStep(2); setCooldown(30);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send OTP.');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    reset();
    if (!/^\d{4,8}$/.test(otp)) { setError('Enter the numeric OTP.'); return; }
    setLoading(true);
    try {
      const data = await registrationApi.verifyOtp(email, otp, PURPOSE);
      setVerificationToken(data.verificationToken);
      setInfo('OTP verified. Choose a new password.');
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    reset(); setLoading(true);
    try {
      await registrationApi.resendOtp(email, channel, PURPOSE);
      setInfo('New OTP sent.'); setCooldown(30);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not resend.');
    } finally { setLoading(false); }
  };

  const submit = async () => {
    reset();
    if (!PASSWORD_RULES.test(password)) {
      setError('Password must be 8+ chars with uppercase, lowercase, digit, and special char.'); return;
    }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await registrationApi.resetPassword(verificationToken, password);
      setInfo('Password reset! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not reset password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-secondary-100 p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-primary-600 text-white px-6 sm:px-8 py-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiShield size={14} /></div>
            <span className="text-base font-bold">KayCare Patient Portal</span>
          </div>
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-primary-100 text-sm mt-1">
            {step === 1 && 'Enter your email and we\'ll send a verification code.'}
            {step === 2 && 'Enter the code we just sent.'}
            {step === 3 && 'Choose a new secure password.'}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {error && <div role="alert" className="mb-3 p-3 rounded-lg border bg-urgent-50 border-urgent-200 text-urgent-700 text-sm">{error}</div>}
          {info && <div className="mb-3 p-3 rounded-lg border bg-success-50 border-success-200 text-success-700 text-sm">{info}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-secondary-800">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                     className="w-full px-4 py-3 rounded-lg border border-secondary-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                     placeholder="your.email@example.com" />
              {/* Only email for now: the "Voice Call" channel is a mock on the backend. */}
              <p className="flex items-center gap-2 text-xs text-secondary-500"><FiMail size={13} /> We'll email you a verification code.</p>
              <button onClick={requestOtp} disabled={loading}
                      className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : <>Send OTP <FiArrowRight size={14} /></>}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-secondary-800">Verification code</label>
              <input inputMode="numeric" maxLength={8} value={otp}
                     onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                     className="w-full px-4 py-3 rounded-lg border border-secondary-200 text-lg tracking-widest text-center font-mono focus:ring-2 focus:ring-primary-500 outline-none"
                     placeholder="6-digit code" />
              <div className="flex items-center justify-between text-xs">
                <button onClick={resend} disabled={cooldown > 0 || loading} className="text-primary-600 font-medium hover:underline disabled:opacity-50">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
                <button onClick={() => setStep(1)} className="text-secondary-500 hover:underline">Change email</button>
              </div>
              <button onClick={verifyOtp} disabled={loading}
                      className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : <>Verify <FiCheck size={14} /></>}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <PwField label="New password" value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw(!showPw)} />
              <PwField label="Confirm password" value={confirm} onChange={setConfirm} show={showPw} toggle={() => setShowPw(!showPw)} />
              <p className="text-xs text-secondary-500">Must be 8+ chars with uppercase, lowercase, digit, and special char.</p>
              <button onClick={submit} disabled={loading}
                      className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : 'Reset password'}
              </button>
            </div>
          )}

          <p className="text-xs text-center text-secondary-500 mt-6">
            Remembered it? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}


function PwField({ label, value, onChange, show, toggle }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-secondary-800 mb-1.5">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
               className="w-full px-4 pr-10 py-3 rounded-lg border border-secondary-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">
          {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}
