import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { registerBiometric } from '../../services/biometric';
import { useAuthStore } from '../../store/useAuthStore';

export default function BiometricEnrollmentScreen() {
  const { pendingEnrollmentUser, setUser, setPendingEnrollmentUser } = useAuthStore();
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');

  if (!pendingEnrollmentUser) return null;

  async function handleEnable() {
    setEnrolling(true);
    setError('');
    const ok = await registerBiometric(
      pendingEnrollmentUser!.id,
      `${pendingEnrollmentUser!.firstName} ${pendingEnrollmentUser!.lastName}`
    );
    if (!ok) {
      setError('Biometric setup failed. You can enable it later from your profile.');
    }
    setUser(pendingEnrollmentUser!);
    setPendingEnrollmentUser(null);
    setEnrolling(false);
  }

  function handleSkip() {
    setUser(pendingEnrollmentUser!);
    setPendingEnrollmentUser(null);
  }

  return (
    <div className="fixed inset-0 z-[300] bg-[#1a3a5c] flex flex-col items-center justify-center px-8 text-center">
      <img src="/logo-transparent.png" alt="SACDO" className="w-32 h-32 object-contain mb-4" />

      <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center mb-4">
        <Fingerprint size={32} className="text-[#c8a951]" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Enable Biometric Login</h2>
      <p className="text-blue-200 text-sm mb-10 max-w-xs">
        Sign in faster next time using your fingerprint or face recognition.
      </p>

      {error && <p className="text-red-300 text-sm mb-4 max-w-xs">{error}</p>}

      <button
        onClick={handleEnable}
        disabled={enrolling}
        className="w-full max-w-xs py-3 rounded-xl bg-[#c8a951] text-[#1a3a5c] font-semibold mb-3 disabled:opacity-60"
      >
        {enrolling ? 'Setting up…' : 'Enable Biometrics'}
      </button>
      <button
        onClick={handleSkip}
        disabled={enrolling}
        className="w-full max-w-xs py-3 rounded-xl border border-white/30 text-white font-medium text-sm disabled:opacity-60"
      >
        Not Now
      </button>
    </div>
  );
}
