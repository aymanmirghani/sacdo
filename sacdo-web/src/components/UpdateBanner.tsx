import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-[#1a3a5c] text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3">
      <p className="text-sm">A new version of SACDO is available.</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="flex-shrink-0 bg-[#c8a951] text-[#1a3a5c] text-sm font-semibold px-4 py-1.5 rounded-xl"
      >
        Update
      </button>
    </div>
  );
}
