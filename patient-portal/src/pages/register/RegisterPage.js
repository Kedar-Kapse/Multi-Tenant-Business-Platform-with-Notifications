import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiShield, FiMail, FiPhone, FiArrowRight, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import { registrationApi } from '../../services/registrationService';

const PURPOSE = 'REGISTRATION';
const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export default function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: choose channel, 2: enter OTP, 3: set password
  const [email, setEmail] = useState(params.get('email') || '');
  const [channel, setChannel] = useState('EMAIL');
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

  const resetMsg = () => { setError(''); setInfo(''); };

  const requestOtp = async () => {
    resetMsg();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.'); return;
    }
    setLoading(true);
    try {
      await registrationApi.requestOtp(email, channel, PURPOSE);
      setInfo(`OTP sent via ${channel === 'EMAIL' ? 'email' : 'voice call'}. It expires in 60 seconds.`);
      setStep(2);
      setCooldown(30);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    resetMsg();
    if (!/^\d{4,8}$/.test(otp)) { setError('Enter the numeric OTP.'); return; }
    setLoading(true);
    try {
      const data = await registrationApi.verifyOtp(email, otp, PURPOSE);
      setVerificationToken(data.verificationToken);
      setInfo('OTP verified. Set a password to finish.');
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid or expired OTP.');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    resetMsg();
    setLoading(true);
    try {
      await registrationApi.resendOtp(email, channel, PURPOSE);
      setInfo('A fresh OTP has been sent.');
      setCooldown(30);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not resend OTP.');
    } finally { setLoading(false); }
  };

  const completeRegistration = async () => {
    resetMsg();
    if (!PASSWORD_RULES.test(password)) {
      setError('Password must be 8+ chars with uppercase, lowercase, digit, and special character.');
      return;
    }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await registrationApi.completeRegistration(verificationToken, password);
      setInfo('Registration complete! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not complete registration.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#dce2ee] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-primary-600 text-white px-8 py-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiShield size={14} /></div>
            <span className="text-base font-bold">KayCare Patient Portal</span>
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-primary-100 text-sm mt-1">
            {step === 1 && 'Confirm your email and we\'ll send you a verification code.'}
            {step === 2 && `Enter the 6-digit code we sent via ${channel === 'EMAIL' ? 'email' : 'phone call'}.`}
            {step === 3 && 'Set a strong password to finish your registration.'}
          </p>
        </div>

        <div className="p-8">
          <Stepper active={step} />
          {error && <Alert tone="error">{error}</Alert>}
          {info && <Alert tone="info">{info}</Alert>}

          {step === 1 && (
            <div className="space-y-4 mt-5">
              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                       placeholder="your.email@example.com"
                       className="w-full px-4 py-3 rounded-lg border border-secondary-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </Field>
              <Field label="Send OTP via">
                <div className="grid grid-cols-2 gap-3">
                  <ChannelOption active={channel === 'EMAIL'} onClick={() => setChannel('EMAIL')} icon={FiMail} label="Email" />
                  <ChannelOption active={channel === 'CALL'} onClick={() => setChannel('CALL')} icon={FiPhone} label="Voice Call" />
                </div>
              </Field>
              <button onClick={requestOtp} disabled={loading}
                      className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : <>Send OTP <FiArrowRight size={14} /></>}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 mt-5">
              <Field label="Verification code">
                <input inputMode="numeric" maxLength={8} value={otp}
                       onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                       placeholder="6-digit code"
                       className="w-full px-4 py-3 rounded-lg border border-secondary-200 text-lg tracking-widest text-center font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
              </Field>
              <div className="flex items-center justify-between text-xs">
                <button onClick={resend} disabled={cooldown > 0 || loading}
                        className="text-primary-600 font-medium hover:underline disabled:opacity-50">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
                <button onClick={() => { setStep(1); resetMsg(); }} className="text-secondary-500 hover:underline">
                  Change email / channel
                </button>
              </div>
              <button onClick={verifyOtp} disabled={loading}
                      className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : <>Verify <FiCheck size={14} /></>}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 mt-5">
              <PasswordField label="New password" value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw(!showPw)} />
              <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} show={showPw} toggle={() => setShowPw(!showPw)} />
              <p className="text-xs text-secondary-500">
                Must be at least 8 characters and include uppercase, lowercase, a digit, and a special character.
              </p>
              <button onClick={completeRegistration} disabled={loading}
                      className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : 'Finish Registration'}
              </button>
            </div>
          )}

          <p className="text-xs text-center text-secondary-500 mt-6">
            Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-secondary-800 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, toggle }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
               className="w-full px-4 pr-10 py-3 rounded-lg border border-secondary-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        <button type="button" onClick={toggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">
          {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>
    </Field>
  );
}

function ChannelOption({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition ${
              active ? 'bg-primary-50 border-primary-500 text-primary-700'
                     : 'bg-white border-secondary-200 text-secondary-600 hover:border-primary-300'
            }`}>
      <Icon size={14} /> {label}
    </button>
  );
}

function Stepper({ active }) {
  const steps = ['Email', 'OTP', 'Password'];
  return (
    <div className="flex items-center justify-between mb-4">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = active > n, current = active === n;
        return (
          <div key={label} className="flex-1 flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              done ? 'bg-emerald-500 text-white' : current ? 'bg-primary-600 text-white' : 'bg-secondary-200 text-secondary-500'
            }`}>{done ? <FiCheck size={12} /> : n}</div>
            <span className={`ml-2 text-xs ${current ? 'text-primary-700 font-medium' : 'text-secondary-400'}`}>{label}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-emerald-500' : 'bg-secondary-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Alert({ tone, children }) {
  const cls = tone === 'error'
    ? 'bg-urgent-50 border-urgent-200 text-urgent-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return <div className={`mb-3 p-3 rounded-lg border text-sm ${cls}`}>{children}</div>;
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}
