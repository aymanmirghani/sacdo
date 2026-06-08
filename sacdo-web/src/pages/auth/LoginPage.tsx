import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPhoneOTP, sendEmailOTP } from '../../services/auth';
import clsx from 'clsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    setError('');
    const trimmed = contact.trim();

    if (method === 'phone') {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length !== 10) {
        setError('Please enter a complete 10-digit US phone number.');
        return;
      }
      const e164 = `+1${digits}`;
      setLoading(true);
      try {
        await sendPhoneOTP(e164);
        navigate('/otp', { state: { method: 'phone', contact: e164 } });
      } catch {
        setError('Failed to send code. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!EMAIL_REGEX.test(trimmed)) {
        setError('Please enter a valid email address.');
        return;
      }
      setLoading(true);
      try {
        await sendEmailOTP(trimmed);
        navigate('/otp', { state: { method: 'email', contact: trimmed } });
      } catch {
        setError('Failed to send code. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-svh flex flex-col bg-white">
      {/* Header */}
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-white p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-white">Sign In</h1>
      </div>

      <div className="flex-1 flex flex-col p-6 max-w-md w-full mx-auto">
        <p className="text-gray-500 mb-8 mt-4">
          Enter your phone number or email to receive a verification code.
        </p>

        {/* Method toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
          {(['phone', 'email'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMethod(m); setContact(''); setError(''); }}
              className={clsx(
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                method === m
                  ? 'bg-[#1a3a5c] text-white'
                  : 'bg-white text-gray-500'
              )}
            >
              {m === 'phone' ? 'Phone' : 'Email'}
            </button>
          ))}
        </div>

        {/* Input */}
        <label className="block mb-1 text-sm font-medium text-gray-700">
          {method === 'phone' ? 'US Phone Number' : 'Email Address'}
        </label>
        <input
          type={method === 'phone' ? 'tel' : 'email'}
          inputMode={method === 'phone' ? 'numeric' : 'email'}
          placeholder={method === 'phone' ? '(555)555-5555' : 'you@example.com'}
          value={contact}
          onChange={(e) =>
            setContact(method === 'phone' ? formatPhone(e.target.value) : e.target.value)
          }
          maxLength={method === 'phone' ? 13 : undefined}
          autoComplete={method === 'phone' ? 'tel' : 'email'}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] mb-2"
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          onClick={handleSend}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#1a3a5c] text-white font-semibold text-base mt-4 disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Send Verification Code'}
        </button>
      </div>
    </div>
  );
}
