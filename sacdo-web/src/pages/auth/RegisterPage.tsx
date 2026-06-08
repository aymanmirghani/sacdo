import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitRegistrationRequest } from '../../services/members';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      setError('All fields are required.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a complete 10-digit US phone number.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await submitRegistrationRequest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: `+1${digits}`,
        email: email.trim(),
      });
      setSubmitted(true);
    } catch {
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Request Submitted</h2>
        <p className="text-gray-500 mb-8">
          Your membership request has been submitted. You will receive a text and email once it has been reviewed.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full max-w-xs py-3 rounded-xl bg-[#1a3a5c] text-white font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
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
        <h1 className="text-xl font-semibold text-white">Request Membership</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 max-w-md w-full mx-auto">
        <p className="text-gray-500 mb-6 mt-4">
          Fill in your details below. An administrator will review your request.
        </p>

        {[
          { label: 'First Name', value: firstName, onChange: setFirstName, type: 'text', autoComplete: 'given-name' },
          { label: 'Last Name',  value: lastName,  onChange: setLastName,  type: 'text', autoComplete: 'family-name' },
        ].map(({ label, value, onChange, type, autoComplete }) => (
          <div key={label} className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
            <input
              type={type}
              autoComplete={autoComplete}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            />
          </div>
        ))}

        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-gray-700">US Phone Number</label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(555)555-5555"
            maxLength={13}
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 text-sm font-medium text-gray-700">Email Address</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
          />
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#1a3a5c] text-white font-semibold text-base mb-3 disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit Request'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full py-3 text-[#1a3a5c] font-medium"
        >
          Back
        </button>
      </form>
    </div>
  );
}
