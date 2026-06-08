import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyPhoneOTP, verifyEmailOTP, sendPhoneOTP, sendEmailOTP } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';

const OTP_EXPIRY = 300; // 5 minutes

export default function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { method: 'phone' | 'email'; contact: string } | null;

  const { setUser } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  // Redirect away if navigated here directly without state
  useEffect(() => {
    if (!state) navigate('/login', { replace: true });
  }, [state, navigate]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  if (!state) return null;

  const { method, contact } = state;
  const expired = secondsLeft <= 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  async function handleVerify() {
    setError('');
    if (!code.trim()) { setError('Please enter the verification code.'); return; }
    if (expired) { setError('Your code has expired. Please request a new one.'); return; }

    setLoading(true);
    try {
      const user = method === 'phone'
        ? await verifyPhoneOTP(contact, code.trim())
        : await verifyEmailOTP(contact, code.trim());

      if (!user || user.status === 'inactive') {
        setError('Not able to validate your information. Please contact an administrator.');
        return;
      }
      setUser(user);
      // App.tsx onAuthStateChanged will handle biometric enrollment prompt
    } catch {
      setError('Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    setResendMsg('');
    try {
      if (method === 'phone') await sendPhoneOTP(contact);
      else await sendEmailOTP(contact);
      setSecondsLeft(OTP_EXPIRY);
      setCode('');
      setResendMsg('A new code has been sent.');
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-svh flex flex-col bg-white">
      {/* Header */}
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3">
        <button onClick={() => navigate('/login')} className="text-white p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-white">Enter Code</h1>
      </div>

      <div className="flex-1 flex flex-col p-6 max-w-md w-full mx-auto">
        <p className="text-gray-500 mb-2 mt-4">
          A verification code was sent to
        </p>
        <p className="font-medium text-gray-800 mb-8">{contact}</p>

        <label className="block mb-1 text-sm font-medium text-gray-700">
          Verification Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-2xl tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] mb-3"
        />

        {/* Timer */}
        {!expired ? (
          <p className="text-sm text-gray-400 mb-4">
            Code expires in {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
        ) : (
          <p className="text-sm text-red-500 mb-4">Code expired</p>
        )}

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {resendMsg && <p className="text-green-600 text-sm mb-4">{resendMsg}</p>}

        <button
          onClick={handleVerify}
          disabled={loading || expired}
          className="w-full py-3 rounded-xl bg-[#1a3a5c] text-white font-semibold text-base mb-3 disabled:opacity-60"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full py-3 rounded-xl border border-[#1a3a5c] text-[#1a3a5c] font-semibold text-base disabled:opacity-60"
        >
          {resending ? 'Sending…' : 'Resend Code'}
        </button>
      </div>
    </div>
  );
}
