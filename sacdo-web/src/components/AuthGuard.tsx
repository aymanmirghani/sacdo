import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

// Shown while Firebase resolves the session on first load
function LoadingScreen() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-[#1a3a5c]">
      <div className="w-12 h-12 rounded-full border-4 border-[#c8a951] border-t-transparent animate-spin" />
    </div>
  );
}

/** Wraps protected member routes — redirects unauthenticated users to / */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Wraps protected admin routes — redirects non-admins to /member */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (!user.isAdmin) return <Navigate to="/member" replace />;
  return <>{children}</>;
}

/** Wraps auth routes — redirects already-signed-in users to their home */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, biometricLocked } = useAuthStore();
  if (loading) return <LoadingScreen />;
  // If biometric-locked, the lock screen overlay handles it — don't redirect
  if (user && !biometricLocked) return <Navigate to={user.isAdmin ? '/admin' : '/member'} replace />;
  return <>{children}</>;
}
