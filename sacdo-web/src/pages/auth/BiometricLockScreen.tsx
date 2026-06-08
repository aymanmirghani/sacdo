import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { auth } from '../../firebase';
import { loadCurrentUser, signOut } from '../../services/auth';
import { authenticateBiometric, disableBiometric } from '../../services/biometric';
import { useAuthStore } from '../../store/useAuthStore';

export default function BiometricLockScreen() {
  const { setUser, setBiometricLocked, clear } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firebaseUser = auth.currentUser;
  const displayName = firebaseUser?.displayName ?? firebaseUser?.email ?? firebaseUser?.phoneNumber ?? '';

  async function handleBiometric() {
    setLoading(true);
    setError('');
    try {
      const ok = await authenticateBiometric();
      if (!ok) {
        setError('Biometric authentication failed. Please try again.');
        return;
      }
      const user = await loadCurrentUser();
      if (!user || user.status === 'inactive') {
        setError('Session expired. Please sign in with OTP.');
        return;
      }
      setUser(user);
      setBiometricLocked(false);
    } catch {
      setError('Biometric authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUseOTP() {
    disableBiometric();
    await signOut();
    clear();
  }

  return (
    <div className="fixed inset-0 z-[300] bg-[#1a3a5c] flex flex-col items-center justify-center px-8 safe-top safe-bottom">
      <img src="/logo-transparent.png" alt="SACDO" className="w-32 h-32 object-contain mb-4" />
      {displayName && (
        <p className="text-blue-200 text-sm mb-10">{displayName}</p>
      )}

      {/* Biometric button */}
      <button
        onClick={handleBiometric}
        disabled={loading}
        className="flex flex-col items-center gap-3 mb-6 disabled:opacity-60"
      >
        <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
          <Fingerprint size={40} className="text-[#c8a951]" />
        </div>
        <span className="text-white font-medium text-sm">
          {loading ? 'Authenticating…' : 'Unlock with Biometrics'}
        </span>
      </button>

      {error && (
        <p className="text-red-300 text-sm text-center mb-6 max-w-xs">{error}</p>
      )}

      <button
        onClick={handleUseOTP}
        className="text-blue-200 text-sm underline underline-offset-2"
      >
        Sign in with OTP instead
      </button>
    </div>
  );
}
