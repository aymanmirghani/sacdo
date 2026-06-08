import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { loadCurrentUser } from './services/auth';
import { isBiometricEnabled, isBiometricSupported } from './services/biometric';
import { useAuthStore } from './store/useAuthStore';
import { router } from './router';
import UpdateBanner from './components/UpdateBanner';
import BiometricLockScreen from './pages/auth/BiometricLockScreen';
import BiometricEnrollmentScreen from './pages/auth/BiometricEnrollmentScreen';

// Session flag — offer enrollment once per sign-in session
const ENROLLMENT_KEY = 'sacdo_enrollment_offered';

export default function App() {
  const {
    setUser, setLoading, setBiometricLocked,
    setPendingEnrollmentUser, pendingEnrollmentUser,
    biometricLocked, clear,
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (isBiometricEnabled()) {
          // Returning user with biometric set up — show lock screen
          setBiometricLocked(true);
        } else {
          const user = await loadCurrentUser();
          if (
            user &&
            isBiometricSupported() &&
            !sessionStorage.getItem(ENROLLMENT_KEY)
          ) {
            // First sign-in this session — offer enrollment before entering the app
            sessionStorage.setItem(ENROLLMENT_KEY, '1');
            setPendingEnrollmentUser(user);
          } else {
            setUser(user);
          }
        }
      } else {
        sessionStorage.removeItem(ENROLLMENT_KEY);
        clear();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setLoading, setBiometricLocked, setPendingEnrollmentUser, clear]);

  return (
    <>
      <RouterProvider router={router} />
      {biometricLocked && <BiometricLockScreen />}
      {pendingEnrollmentUser && <BiometricEnrollmentScreen />}
      <UpdateBanner />
    </>
  );
}
