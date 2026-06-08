import { useAuthStore } from '../../store/useAuthStore';
import { signOut } from '../../services/auth';
import { isBiometricEnabled, disableBiometric } from '../../services/biometric';
import { useState } from 'react';

export default function MemberProfilePage() {
  const { user, clear } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(isBiometricEnabled());

  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    clear();
  }

  function handleDisableBiometric() {
    disableBiometric();
    setBiometricEnabled(false);
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-white">Profile</h1>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Identity card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-[#1a3a5c] flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-[#c8a951]">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">{user.firstName} {user.lastName}</p>
              <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {user.role}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { label: 'Phone',        value: user.phone },
              { label: 'Email',        value: user.email },
              { label: 'Member since', value: user.createdAt?.toLocaleDateString() },
              { label: 'Status',       value: user.status },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Biometric setting */}
        {biometricEnabled && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Biometric Login</p>
              <p className="text-xs text-gray-400">Enabled on this device</p>
            </div>
            <button
              onClick={handleDisableBiometric}
              className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg"
            >
              Disable
            </button>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
